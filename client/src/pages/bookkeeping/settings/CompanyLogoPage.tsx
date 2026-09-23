import { useState, useRef, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "../sidebar";
import SettingsTabs from "../../../components/bookkeeping/SettingsTabs";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../hooks/useAuth";
import {
  ChevronRight,
  Building2,
  ImageIcon,
  RefreshCw,
  UploadCloud,
  Trash2,
  Building,
} from "lucide-react";

export default function CompanyLogoPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/company-logo");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const rawClientId = params1?.id || params2?.id || "";

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const effectiveClientId = useMemo(() => {
    if (rawClientId) return rawClientId;
    if (clients.length > 0) return String(clients[0].id);
    return "";
  }, [rawClientId, clients]);

  const activeClient = useMemo(() => {
    return clients.find((c: any) => String(c.id) === String(effectiveClientId));
  }, [clients, effectiveClientId]);

  const { data: companyData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/company-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!effectiveClientId,
  });

  const companyInfo = companyData?.companyInfo || {};
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = useAuth.getState().token;
    const formData = new FormData();
    formData.append("logo", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    setLogoUploading(true);
    try {
      const res = await fetch(`/api/bookkeeping/settings/${effectiveClientId}/logo`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Logo Uploaded", description: "Company logo updated successfully." });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/logo`);
      if (!res.ok) throw new Error("Failed to delete logo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Logo Removed", description: "Company logo has been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout
      sidebar={effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar}
      module="Bookkeeping"
    >
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Navigation Breadcrumb & Client Switcher */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700">Company Logo</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => navigate(`/bookkeeping/${e.target.value}/company-logo`)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Company Logo
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Upload and manage corporate branding logo for high-resolution rendering on Invoices, Quotations, and Client Statements.
              </p>
            </div>
          </div>

          <SettingsTabs activeTab="company_logo" clientId={effectiveClientId} />

          {/* Guidelines Info Alert */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-xl mt-0.5">
              <ImageIcon size={18} />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-purple-900">Logo Presentation Guidelines</div>
              <p className="text-purple-700">
                For optimal high-definition rendering on PDF documents, we recommend an image of approximately{" "}
                <strong>120 x 600 pixels</strong> (or rectangular landscape format).
              </p>
              <p className="text-purple-600 font-medium">Supported formats: PNG, JPG, JPEG, SVG, WEBP (Max 5MB).</p>
            </div>
          </div>

          {/* Logo Card & Upload Zone */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            {companyInfo.logoUrl ? (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-700">Active Company Logo</div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center max-w-md">
                  <img
                    src={companyInfo.logoUrl}
                    alt="Company Logo"
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw size={13} className={logoUploading ? "animate-spin" : ""} />
                    <span>{logoUploading ? "Uploading..." : "Replace Logo"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to remove the company logo?")) {
                        deleteLogoMutation.mutate();
                      }
                    }}
                    disabled={deleteLogoMutation.isPending}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove Logo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/40 rounded-2xl p-12 text-center transition-colors cursor-pointer space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 text-purple-600 mx-auto flex items-center justify-center">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">Click to upload company logo</span>
                  <span className="text-xs text-slate-500">or drag and drop your file here</span>
                </div>
                <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                  Browse File
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
