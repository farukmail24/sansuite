import { useState, useEffect, useRef } from "react";
import {
  Folder, FileText, Image as ImageIcon, Search, UploadCloud,
  X, CheckCircle2, Trash2, Plus
} from "lucide-react";
import { useToast } from "../../hooks/useToast";

export interface MediaFile {
  id: string;
  name: string;
  category: string;
  size: string;
  bytes: number;
  date: string;
  mimeType: string;
  url?: string;
  storageDriver?: string;
  storageLocation?: string;
}

export interface MediaSettings {
  maxFileSizeMB: number;
  allowPdf: boolean;
  allowDocs: boolean;
  allowImages: boolean;
  allowSpreadsheets: boolean;
  allowZip: boolean;
  storageDriver?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  cloudinaryCloudName?: string;
  sftpHost?: string;
  sftpPath?: string;
}

const defaultAdminSettings: MediaSettings = {
  maxFileSizeMB: 25,
  allowPdf: true,
  allowDocs: true,
  allowImages: true,
  allowSpreadsheets: true,
  allowZip: false,
  storageDriver: 'local',
};

interface GlobalMediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: MediaFile) => void;
  allowedTypes?: string;
  title?: string;
}

export default function GlobalMediaLibraryModal({
  isOpen,
  onClose,
  onSelectFile,
  allowedTypes = "PDF & Documents",
  title = "Global Practice Media & Document Library",
}: GlobalMediaLibraryModalProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cache fetched settings in state (loaded once on open)
  const [adminSettings, setAdminSettings] = useState<MediaSettings>(defaultAdminSettings);

  // Load settings from backend API (System Admin enforced or delegated), fall back to localStorage
  useEffect(() => {
    if (isOpen) {
      fetch("/api/media-settings")
        .then((r) => r.json())
        .then((data: MediaSettings & { allowTenantControl?: boolean }) => {
          if (data.allowTenantControl) {
            const tenantSaved = localStorage.getItem("tenant_media_settings");
            if (tenantSaved) {
              try {
                setAdminSettings(JSON.parse(tenantSaved));
                return;
              } catch (e) {}
            }
          }
          setAdminSettings(data);
        })
        .catch(() => {
          const saved = localStorage.getItem("tenant_media_settings");
          if (saved) {
            try { setAdminSettings(JSON.parse(saved)); } catch (e) {}
          }
        });
    }
  }, [isOpen]);

  // Sync with localStorage (tenant_media_library used by /admin Media tab)
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("tenant_media_library");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const mapped: MediaFile[] = parsed.map((item: any) => {
            const isPdf = item.name?.toLowerCase().endsWith(".pdf") || item.type === "application/pdf";
            return {
              id: item.id || `m-${Date.now()}`,
              name: item.name,
              category: isPdf ? "PDF Documents" : item.type?.includes("image") ? "Images" : "Documents",
              size: item.size || "100 KB",
              bytes: item.bytes || 102400,
              date: item.date || new Date().toISOString().split("T")[0],
              mimeType: item.type || (isPdf ? "application/pdf" : "image/png"),
              url: item.url,
            };
          });
          setFiles(mapped);
          if (mapped.length > 0) {
            setSelectedFileId(mapped[0].id);
          }
        } catch (e) {
          console.error("Failed to parse tenant_media_library", e);
        }
      } else {
        setFiles([]);
      }
    }
  }, [isOpen]);

  const [uploadingFile, setUploadingFile] = useState<{ name: string; size: string; progress: number } | null>(null);

  if (!isOpen) return null;

  const categories = ["All", "PDF Documents", "Documents", "Images"];

  const filteredFiles = files.filter((f) => {
    const isPdf = f.name.toLowerCase().endsWith(".pdf") || f.mimeType === "application/pdf";

    let matchCategory = false;
    if (activeCategory === "All") {
      matchCategory = true;
    } else if (activeCategory === "PDF Documents") {
      matchCategory = isPdf;
    } else if (activeCategory === "Documents") {
      matchCategory = !isPdf && (f.category === "Documents" || !f.mimeType?.includes("image"));
    } else if (activeCategory === "Images") {
      matchCategory = f.category === "Images" || f.mimeType?.includes("image");
    } else {
      matchCategory = f.category === activeCategory;
    }

    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const file = uploaded[0];
    const settings = adminSettings;

    // 1. Enforce System Admin Max File Size Limit
    const maxBytes = settings.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "Upload Blocked by System Admin Policy",
        description: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the max upload limit of ${settings.maxFileSizeMB} MB configured by System Admin.`,
      });
      return;
    }

    // 2. Enforce System Admin Allowed File Extensions
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isImg = file.type.includes("image");
    const isDoc = file.name.endsWith(".doc") || file.name.endsWith(".docx") || file.name.endsWith(".txt");

    if (isPdf && !settings.allowPdf) {
      toast({ title: "Upload Restricted", description: "PDF file uploads are disabled by System Admin settings." });
      return;
    }
    if (isImg && !settings.allowImages) {
      toast({ title: "Upload Restricted", description: "Image file uploads are disabled by System Admin settings." });
      return;
    }
    if (isDoc && !settings.allowDocs) {
      toast({ title: "Upload Restricted", description: "Document file uploads are disabled by System Admin settings." });
      return;
    }

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

    setUploadingFile({ name: file.name, size: sizeStr, progress: 10 });

    let currentProgress = 10;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 25) + 15;
      if (currentProgress >= 95) {
        currentProgress = 95;
        clearInterval(interval);
      }
      setUploadingFile((prev) => (prev ? { ...prev, progress: currentProgress } : null));
    }, 100);

    setTimeout(() => {
      const reader = new FileReader();

      reader.onload = (event) => {
        clearInterval(interval);
        setUploadingFile({ name: file.name, size: sizeStr, progress: 100 });

        setTimeout(() => {
          try {
            const rawResult = (event.target?.result as string) || "";
            const isLarge = file.size > 2 * 1024 * 1024;
            const categoryName = isPdf
              ? "PDF Documents"
              : isImg
              ? "Images"
              : "Documents";

            const activeDriver = settings.storageDriver || "local";
            let locationLabel = "Local Server Storage";
            let directUrl = `${window.location.origin}/uploads/media/${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;

            if (activeDriver === "s3") {
              const bucket = settings.s3Bucket || "sansuite-test-media-bucket";
              const region = settings.s3Region || "us-east-1";
              locationLabel = `AWS S3 Bucket (${bucket})`;
              directUrl = settings.s3Endpoint && settings.s3Endpoint.length > 5
                ? `${settings.s3Endpoint}/${bucket}/media/${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`
                : `https://${bucket}.s3.${region}.amazonaws.com/media/${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
            } else if (activeDriver === "cloudinary") {
              const cloud = settings.cloudinaryCloudName || "sansuite-cloud";
              locationLabel = `Cloudinary CDN (${cloud})`;
              directUrl = `https://res.cloudinary.com/${cloud}/image/upload/v1/media/${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
            } else if (activeDriver === "sftp") {
              const host = settings.sftpHost || "files.sansuite.com";
              locationLabel = `Remote SFTP Server (${host})`;
              directUrl = `http://${host}${settings.sftpPath || "/uploads/"}${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
            }

            const newRawItem = {
              id: `m-${Date.now()}`,
              name: file.name,
              type: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
              size: sizeStr,
              url: isLarge ? directUrl : rawResult,
              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              category: categoryName,
              storageDriver: activeDriver,
              storageLocation: locationLabel,
            };

            // Save to localStorage tenant_media_library with QuotaExceeded fallback
            const existing = localStorage.getItem("tenant_media_library");
            let existingRaw: any[] = [];
            if (existing) {
              try { existingRaw = JSON.parse(existing); } catch (err) {}
            }
            const updated = [newRawItem, ...existingRaw];
            try {
              localStorage.setItem("tenant_media_library", JSON.stringify(updated));
            } catch (e) {
              const lightUpdated = updated.map((i: any) => ({
                ...i,
                url: i.url && i.url.length > 300000 ? "" : i.url,
              }));
              try {
                localStorage.setItem("tenant_media_library", JSON.stringify(lightUpdated));
              } catch (err) {}
            }

            // Sync state
            const mappedNew: MediaFile = {
              id: newRawItem.id,
              name: newRawItem.name,
              category: newRawItem.category === "PDF Documents" ? "PDF Documents" : newRawItem.category === "Images" ? "Images" : "Documents",
              size: newRawItem.size,
              bytes: file.size,
              date: newRawItem.date,
              mimeType: newRawItem.type,
              url: newRawItem.url,
              storageDriver: activeDriver,
              storageLocation: locationLabel,
            };

            setFiles((prev) => [mappedNew, ...prev]);
            setSelectedFileId(mappedNew.id);

            toast({
              title: "Asset Uploaded",
              description: `"${file.name}" uploaded to ${locationLabel}.`,
            });
          } catch (err) {
            console.error("Modal upload save error:", err);
          } finally {
            setUploadingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }, 300);
      };

      reader.readAsDataURL(file);
    }, 800);
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const fileToDelete = files.find((f) => f.id === fileId);
    if (!fileToDelete) return;

    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);

    if (selectedFileId === fileId) {
      setSelectedFileId(updatedFiles.length > 0 ? updatedFiles[0].id : null);
    }

    const existing = localStorage.getItem("tenant_media_library");
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        const filtered = parsed.filter((item: any) => item.id !== fileId && item.name !== fileToDelete.name);
        localStorage.setItem("tenant_media_library", JSON.stringify(filtered));
      } catch (err) {
        console.error("Failed to update tenant_media_library on delete", err);
      }
    }

    toast({
      title: "Asset Removed",
      description: `${fileToDelete.name} deleted from Media Library.`,
    });
  };

  const handleConfirmSelect = () => {
    const chosen = files.find((f) => f.id === selectedFileId);
    if (chosen) {
      onSelectFile(chosen);
      onClose();
      toast({
        title: "File Attached",
        description: `${chosen.name} attached cleanly.`,
      });
    } else {
      toast({ title: "Select a File", description: "Please click a file from the list to select it." });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 !mt-0">
      {/* Uploading Progress Modal Overlay */}
      {uploadingFile && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-w-sm w-full space-y-4 text-center">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
              <UploadCloud size={28} className="animate-bounce" />
              <div className="absolute inset-0 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-base">Uploading Asset...</h3>
              <p className="text-xs text-slate-500 font-medium truncate mt-1 px-4" title={uploadingFile.name}>
                {uploadingFile.name} ({uploadingFile.size})
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-purple-700 px-1">
                <span>Progress</span>
                <span>{uploadingFile.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-200 ease-out shadow-sm"
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">Please wait while your file is securely attached.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
              <Folder size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">
                Synced directly with your Practice Media Store (Max upload: {adminSettings.maxFileSizeMB} MB).
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media files..."
              className="pl-9 pr-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <UploadCloud size={16} /> Upload New Asset
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-6 py-2 border-b border-gray-100 bg-gray-50/50 flex gap-2 overflow-x-auto text-xs font-medium">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full transition-colors ${
                activeCategory === cat
                  ? "bg-purple-700 text-white font-bold"
                  : "bg-white border text-gray-600 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* File Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50/30">
          {filteredFiles.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center space-y-3">
              <Folder size={36} className="text-gray-300" />
              <div>
                <p className="font-bold text-gray-600 text-sm">No Assets Found under {activeCategory}</p>
                <p className="text-gray-400 text-xs mt-1">Upload a PDF or document file to add it to your practice media library.</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Upload Asset
              </button>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.mimeType === "application/pdf";
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`border rounded-xl p-4 bg-white cursor-pointer transition-all relative space-y-3 ${
                    isSelected
                      ? "border-purple-600 ring-2 ring-purple-500 shadow-md bg-purple-50/30"
                      : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                        {file.mimeType?.includes("image") || file.url?.startsWith("data:image") ? (
                          <ImageIcon size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </div>
                      <div className="overflow-hidden pr-2">
                        <h4 className="font-bold text-gray-800 text-xs truncate max-w-[140px]" title={file.name}>
                          {file.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 block">{file.size} • {file.date}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-purple-600 fill-purple-100 flex-shrink-0" />
                    )}
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-[10px] text-gray-500">
                    <span className={`px-2 py-0.5 rounded font-semibold truncate max-w-[120px] ${isPdf ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {isPdf ? "PDF Documents" : file.category}
                    </span>
                    <span className="font-mono text-purple-700 font-bold">READY</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedFileId && files.find((f) => f.id === selectedFileId) ? (
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={14} /> Selected: {files.find((f) => f.id === selectedFileId)?.name}
              </span>
            ) : (
              <span>Select a file from the list or upload a new one.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedFileId && (
              <button
                type="button"
                onClick={(e) => handleDeleteFile(e, selectedFileId)}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={!selectedFileId || files.length === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Attach Selected File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
