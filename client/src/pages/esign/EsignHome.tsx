import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  FileSignature, Send, Edit3, Settings, LayoutTemplate,
  Search, MoreVertical, Download, AlertCircle, FileText,
  Plus, Check, X, Shield, Upload, Trash2, CheckCircle2, Clock,
  Copy, Eye, Lock, RotateCcw, UserPlus, KeyRound, ArrowRight,
  ArrowLeft, Users, CheckSquare, Calendar, ChevronRight, XCircle,
  FolderOpen, Paperclip, FileCheck, ChevronLeft, Move, MousePointerClick, ExternalLink, Loader2, Image as ImageIcon,
  Mail, PenTool, Type
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";

// Configure PDF.js worker using local file (Vite new URL resolver - pdfjs-dist v5)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
import GlobalMediaLibraryModal, { MediaFile } from "../../components/common/GlobalMediaLibraryModal";
import { generatePdfCertificate } from "../../lib/pdfCertificateGenerator";

const sidebar = [
  { label: "Overview", icon: <FileText size={15} />, route: "/esign" },
  { label: "Sign Documents", icon: <Send size={15} />, route: "/esign?tab=sign" },
  { label: "My Signature", icon: <Edit3 size={15} />, route: "/esign?tab=my-signature" },
  { label: "Templates", icon: <LayoutTemplate size={15} />, route: "/esign?tab=templates" },
  { label: "Settings", icon: <Settings size={15} />, route: "/esign?tab=settings" },
];

const statusFilters = [
  "All", "Awaiting Approval", "Signed", "Declined", "Draft", "Cancelled"
];

const sourceModules = [
  "Accounts Production", "Corporation Tax", "Self Assessment", "Bookkeeping", "Practice Management", "Direct Upload"
];

export default function eSignHome() {
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const currentTab = searchParams.get("tab") || "overview";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters State for Overview
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState("All");

  // Document Details / Audit Log Modal
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  // Media Modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // ========================================================
  // 1. DATA QUERIES
  // ========================================================

  // Fetch Documents
  const { data: docData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ["/api/esign/documents", activeFilter, search, activeModuleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter !== "All") params.append("status", activeFilter);
      if (activeModuleFilter !== "All") params.append("sourceModule", activeModuleFilter);
      if (search.trim()) params.append("search", search.trim());
      const res = await apiRequest("GET", `/api/esign/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const documents = docData?.documents || [];
  const counts = docData?.counts || { total: 0, awaiting: 0, signed: 0, declined: 0, drafts: 0, cancelled: 0 };

  // Fetch Single Document Details (for modal)
  const { data: docDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["/api/esign/documents", selectedDocId],
    queryFn: async () => {
      if (!selectedDocId) return null;
      const res = await apiRequest("GET", `/api/esign/documents/${selectedDocId}`);
      if (!res.ok) throw new Error("Failed to load document details");
      return res.json();
    },
    enabled: !!selectedDocId,
  });

  // Fetch Practice Clients (for client selector)
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Templates
  const { data: templatesList = [] } = useQuery<any[]>({
    queryKey: ["/api/esign/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/templates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Settings
  const { data: settingsData } = useQuery({
    queryKey: ["/api/esign/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch My Signature
  const { data: mySignatureData } = useQuery({
    queryKey: ["/api/esign/my-signature"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/esign/my-signature");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // ========================================================
  // 2. MUTATIONS
  // ========================================================

  // Create Document (Wizard)
  const createDocMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/esign/documents", payload);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to create document");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      toast({
        title: "Signature Request Dispatched",
        description: data.message || "Document created successfully!",
      });
      // Reset wizard
      setWizardStep(1);
      setWizardForm({
        title: "",
        sourceModule: "Accounts Production",
        clientId: "",
        filePath: "",
        fileName: "",
        fileSize: 250000,
        attachments: [],
        templateId: "tpl_standard",
        emailSubject: "Signature Request: {{documentTitle}} from {{firmName}}",
        emailCustomBody: "Dear {{signerName}},\n\nPlease review and electronically sign the attached {{documentTitle}}.\n\nClick the link below to access your document:\n{{signingUrl}}\n\nThank you,\n{{firmName}}",
        message: "",
        expiryDays: "14",
        isPasswordProtected: false,
        accessCode: "",
      });
      setActiveDocIdx(0);
      setSigners([{ signerName: "", signerEmail: "", signerRole: "Signer" }]);
      setFields([{ fieldType: "Signature", pageNumber: 1, coordX: 20, coordY: 75, width: 25, height: 8 }]);
      navigate("/esign");
    },
    onError: (err: any) => {
      toast({
        title: "Error Creating Request",
        description: err.message || "Please check required fields.",
        variant: "destructive",
      });
    },
  });

  // Resend Reminder
  const remindMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/esign/documents/${id}/remind`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to send reminder");
      }
      return res.json();
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      toast({ title: "Reminder Sent", description: d.message });
    },
    onError: (err: any) => {
      toast({ title: "Reminder Error", description: err.message, variant: "destructive" });
    },
  });

  // Cancel Request
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/esign/documents/${id}/cancel`);
      if (!res.ok) throw new Error("Failed to cancel document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      toast({ title: "Cancelled", description: "Signature request has been cancelled." });
      setSelectedDocId(null);
    },
  });

  // Delete Document
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/esign/documents/${id}`);
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/documents"] });
      toast({ title: "Deleted", description: "Document deleted successfully." });
      setSelectedDocId(null);
    },
  });

  // Save Settings
  const settingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/esign/settings", payload);
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/settings"] });
      toast({ title: "Settings Saved", description: "eSign preferences updated cleanly." });
    },
  });

  // Save My Signature
  const signatureMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/esign/my-signature", payload);
      if (!res.ok) throw new Error("Failed to save signature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/my-signature"] });
      toast({ title: "Signature Saved", description: "Your digital signature profile has been updated." });
    },
  });

  // Save Template
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/esign/templates", payload);
      if (!res.ok) throw new Error("Failed to save template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/templates"] });
      toast({ title: "Template Saved", description: "New template added to library." });
      setIsNewTemplateModalOpen(false);
    },
  });

  // Delete Template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/esign/templates/${id}`);
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esign/templates"] });
      toast({ title: "Template Removed", description: "Template deleted from library." });
    },
  });

  // ========================================================
  // 3. WIZARD STATE (4-Step Capisign Process)
  // ========================================================
  const defaultEmailTemplates = [
    {
      id: "default",
      name: "Default eSign Invitation",
      category: "General",
      subject: "Signature Request: {{documentTitle}} from {{firmName}}",
      emailBody: "Dear {{signerName}},\n\n{{firmName}} has prepared an electronic document package that requires your official review and signature.\n\nPlease review and sign using the secure portal link below:\n{{signingUrl}}",
    },
    {
      id: "accounts_approval",
      name: "Year-End Statutory Accounts Approval",
      category: "Accounts Production",
      subject: "Approval & Signature Required: Year-End Statutory Accounts - {{firmName}}",
      emailBody: "Dear {{signerName}},\n\nPlease review and approve the attached Year-End Statutory Accounts prepared by {{firmName}}. Once signed, we will submit your final accounts to Companies House and HMRC.\n\nPlease click below to review and sign:\n{{signingUrl}}",
    },
    {
      id: "tax_return",
      name: "Corporation Tax Return (CT600) Signing",
      category: "Corporation Tax",
      subject: "CT600 Tax Return Signature Request - {{firmName}}",
      emailBody: "Dear {{signerName}},\n\nYour Corporation Tax Return (CT600) and computation for the financial period are ready for your electronic signature.\n\nPlease click below to review and execute:\n{{signingUrl}}",
    },
    {
      id: "engagement_letter",
      name: "Letter of Engagement & Terms of Service",
      category: "Practice Management",
      subject: "Letter of Engagement & Terms of Service - {{firmName}}",
      emailBody: "Dear {{signerName}},\n\nWelcome to {{firmName}}! Attached is our Letter of Engagement outlining our agreed scope of services and regulatory compliance terms.\n\nPlease review and sign to proceed with onboarding:\n{{signingUrl}}",
    },
    {
      id: "payroll_rti",
      name: "Monthly Payroll & Pension Summary Approval",
      category: "Payroll",
      subject: "Monthly Payroll & Pension Summary Approval - {{firmName}}",
      emailBody: "Dear {{signerName}},\n\nPlease review and sign off on your periodic payroll summary and PAYE liability before we submit the Real Time Information (RTI) FPS to HMRC.\n\nPlease review and sign here:\n{{signingUrl}}",
    },
  ];

  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    title: "",
    sourceModule: "Accounts Production",
    clientId: "",
    filePath: "",
    fileName: "",
    fileSize: 250000,
    attachments: [] as Array<{ fileName: string; filePath: string; fileSize?: number }>,
    templateId: "default",
    emailSubject: "Signature Request: {{documentTitle}} from {{firmName}}",
    emailCustomBody: "Dear {{signerName}},\n\n{{firmName}} has prepared an electronic document package that requires your official review and signature.\n\nPlease review and sign using the secure portal link below:\n{{signingUrl}}",
    message: "",
    expiryDays: "14",
    isPasswordProtected: false,
    accessCode: "",
  });

  const [signers, setSigners] = useState<Array<{ signerName: string; signerEmail: string; signerRole: string }>>([
    { signerName: "", signerEmail: "", signerRole: "Signer" },
  ]);

  const [fields, setFields] = useState<Array<{
    fieldType: string;
    pageNumber: number;
    coordX: number;
    coordY: number;
    width: number;
    height: number;
    signerIndex?: number;
    fileIndex?: number;
  }>>([
    { fieldType: "Signature", pageNumber: 1, coordX: 60, coordY: 78, width: 30, height: 10, signerIndex: 0, fileIndex: 0 },
  ]);

  const [activeDocIdx, setActiveDocIdx] = useState<number>(0);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [docPageCounts, setDocPageCounts] = useState<Record<number, number>>({});
  const [activeFieldIdx, setActiveFieldIdx] = useState<number>(0);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  // Measure canvas container for react-pdf responsive width
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (canvasContainerRef.current) {
        const w = Math.floor(canvasContainerRef.current.clientWidth);
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(el);
    return () => observer.disconnect();
  }, [wizardStep, activeDocIdx]);

  // Client Selection auto-fill
  const handleClientSelect = (clientId: string) => {
    const selected = clientsList.find((c) => String(c.id) === clientId);
    if (selected) {
      setWizardForm((prev) => ({
        ...prev,
        clientId,
        title: prev.title || `${selected.companyName || selected.clientName} - Document Approval`,
      }));
      if (signers[0] && !signers[0].signerEmail) {
        setSigners([
          {
            signerName: selected.contactName || selected.clientName || "Client Director",
            signerEmail: selected.email || "",
            signerRole: "Signer",
          },
        ]);
      }
    } else {
      setWizardForm((prev) => ({ ...prev, clientId }));
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Handle uploading multiple PDF documents
  const handleMultiplePdfUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingLocal(true);
    try {
      const token = useAuth.getState().token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const formData = new FormData();
      const validFiles: File[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const isPdf = f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf";
        if (isPdf && f.size <= 25 * 1024 * 1024) {
          formData.append("files", f);
          validFiles.push(f);
        }
      }

      if (validFiles.length === 0) {
        toast({
          title: "Invalid Files",
          description: "Please select valid PDF documents up to 25MB each.",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch("/api/esign/upload-multiple", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload PDF files");
      }

      const data = await res.json();
      const uploadedFiles: Array<{ fileName: string; filePath: string; fileSize: number }> = data.files || [];
      const updatedAttachments = [...(wizardForm.attachments || []), ...uploadedFiles];

      setWizardForm((prev) => ({
        ...prev,
        attachments: updatedAttachments,
        fileName: updatedAttachments[0]?.fileName || prev.fileName,
        filePath: updatedAttachments[0]?.filePath || prev.filePath,
        fileSize: updatedAttachments[0]?.fileSize || prev.fileSize,
        title: prev.title || updatedAttachments[0]?.fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      }));

      toast({
        title: "Documents Attached",
        description: `Successfully uploaded and attached ${uploadedFiles.length} PDF file(s).`,
      });
    } catch (err: any) {
      console.error("Multi-upload failed:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload PDF documents.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLocal(false);
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    const updated = (wizardForm.attachments || []).filter((_, i) => i !== indexToRemove);
    setWizardForm((prev) => ({
      ...prev,
      attachments: updated,
      fileName: updated[0]?.fileName || "",
      filePath: updated[0]?.filePath || "",
      fileSize: updated[0]?.fileSize || 0,
    }));
    if (activeDocIdx >= updated.length) {
      setActiveDocIdx(Math.max(0, updated.length - 1));
      setPreviewPage(1);
    }
  };

  const handleMediaSelect = async (file: MediaFile) => {
    const numBytes = typeof file.bytes === "number" ? file.bytes : 250000;
    let targetPath = file.name;

    if (file.url) {
      if (file.url.startsWith("data:")) {
        try {
          const blobRes = await fetch(file.url);
          const blob = await blobRes.blob();
          const formData = new FormData();
          formData.append("file", blob, file.name);

          const token = useAuth.getState().token;
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const upRes = await fetch("/api/esign/upload", {
            method: "POST",
            headers,
            body: formData,
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            targetPath = upData.filePath;
          }
        } catch (e) {
          console.warn("Could not save media blob to server:", e);
        }
      } else {
        targetPath = file.url;
      }
    }

    const newAttachment = { fileName: file.name, filePath: targetPath, fileSize: numBytes };
    const updatedAttachments = [...(wizardForm.attachments || []), newAttachment];

    setWizardForm((prev) => ({
      ...prev,
      attachments: updatedAttachments,
      fileName: updatedAttachments[0]?.fileName || file.name,
      filePath: updatedAttachments[0]?.filePath || targetPath,
      fileSize: updatedAttachments[0]?.fileSize || numBytes,
      title: prev.title || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    }));

    toast({
      title: "File Attached",
      description: `${file.name} added to attached documents.`,
    });
  };

  // Select dynamic template in Step 1
  const handleSelectEmailTemplate = (templateId: string) => {
    const builtIn = defaultEmailTemplates.find((t) => t.id === templateId);
    if (builtIn) {
      setWizardForm((prev) => ({
        ...prev,
        templateId,
        emailSubject: builtIn.subject,
        emailCustomBody: builtIn.emailBody,
      }));
      return;
    }

    const custom = templatesList.find((t) => String(t.id) === templateId);
    if (custom) {
      setWizardForm((prev) => ({
        ...prev,
        templateId,
        emailSubject: custom.subject || `Signature Request: {{documentTitle}} from {{firmName}}`,
        emailCustomBody: custom.emailBody || custom.description || "Please review and sign using the secure portal link below:\n{{signingUrl}}",
      }));
      if (custom.fieldsJson && Array.isArray(custom.fieldsJson)) {
        setFields(custom.fieldsJson);
      }
    }
  };

  // Signer management
  const addSigner = () => {
    setSigners([...signers, { signerName: "", signerEmail: "", signerRole: "Signer" }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length <= 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: string, value: string) => {
    setSigners(
      signers.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // Dispatch Wizard
  const handleDispatchWizard = (isDraft = false) => {
    if (!wizardForm.title.trim()) {
      toast({ title: "Validation Error", description: "Document title is required", variant: "destructive" });
      return;
    }
    const validSigners = signers.filter((s) => s.signerEmail.trim());
    if (!isDraft && validSigners.length === 0) {
      toast({ title: "Validation Error", description: "At least one signatory email is required", variant: "destructive" });
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(wizardForm.expiryDays || "14"));

    const finalAttachments = (wizardForm.attachments && wizardForm.attachments.length > 0)
      ? wizardForm.attachments
      : wizardForm.filePath
        ? [{ fileName: wizardForm.fileName || wizardForm.title, filePath: wizardForm.filePath, fileSize: wizardForm.fileSize }]
        : [];

    createDocMutation.mutate({
      title: wizardForm.title,
      sourceModule: wizardForm.sourceModule,
      filePath: finalAttachments[0]?.filePath || wizardForm.filePath || wizardForm.fileName,
      attachments: finalAttachments,
      fileSize: wizardForm.fileSize,
      clientId: wizardForm.clientId || null,
      message: wizardForm.message || null,
      emailSubject: wizardForm.emailSubject || null,
      emailCustomBody: wizardForm.emailCustomBody || null,
      expiryDate: expiryDate.toISOString(),
      isPasswordProtected: wizardForm.isPasswordProtected,
      accessCode: wizardForm.accessCode || null,
      signers: validSigners,
      fields,
      isDraft,
    });
  };

  // Launch from Template
  const handleUseTemplate = (template: any) => {
    setWizardForm({
      ...wizardForm,
      title: `${template.name} - ${new Date().getFullYear()}`,
      sourceModule: template.category === "Accounts Production" ? "Accounts Production" : "Direct Upload",
      templateId: String(template.id),
      emailSubject: template.subject || `Signature Request: ${template.name} from {{firmName}}`,
      emailCustomBody: template.emailBody || "Please review and sign using the link below:\n{{signingUrl}}",
    });
    if (template.fieldsJson && Array.isArray(template.fieldsJson)) {
      setFields(template.fieldsJson);
    }
    setWizardStep(1);
    navigate("/esign?tab=sign");
  };

  // Field management
  const addField = (type: string) => {
    const isSig = type === "Signature" || type === "My Signature";
    const newField = {
      fieldType: type,
      fileIndex: activeDocIdx,
      pageNumber: previewPage,
      coordX: 60,
      coordY: Math.min(80, 20 + fields.filter((f) => (f.fileIndex ?? 0) === activeDocIdx && f.pageNumber === previewPage).length * 15),
      width: isSig ? 30 : type === "Date" ? 22 : 25,
      height: isSig ? 10 : 7,
      signerIndex: 0,
    };
    setFields([...fields, newField]);
    setActiveFieldIdx(fields.length);
  };

  const updateField = (index: number, updates: Partial<(typeof fields)[0]>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    if (activeFieldIdx >= updated.length) {
      setActiveFieldIdx(Math.max(0, updated.length - 1));
    }
  };

  const setFieldPreset = (index: number, preset: "bottom-right" | "bottom-left" | "center" | "top-right") => {
    if (preset === "bottom-right") {
      updateField(index, { coordX: 60, coordY: 78, width: 30, height: 10 });
    } else if (preset === "bottom-left") {
      updateField(index, { coordX: 10, coordY: 78, width: 30, height: 10 });
    } else if (preset === "center") {
      updateField(index, { coordX: 35, coordY: 45, width: 30, height: 10 });
    } else if (preset === "top-right") {
      updateField(index, { coordX: 60, coordY: 15, width: 30, height: 10 });
    }
  };

  // ========================================================
  // 4. MY SIGNATURE STUDIO STATE
  // ========================================================
  const [sigType, setSigType] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState("SanSuite Accountant");
  const [selectedFont, setSelectedFont] = useState("font-serif italic");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedSigImage, setUploadedSigImage] = useState<string | null>(null);
  const [isDraggingSigImage, setIsDraggingSigImage] = useState(false);
  const sigImageInputRef = useRef<HTMLInputElement | null>(null);

  // Sync loaded signature
  useEffect(() => {
    if (mySignatureData?.signatureData) {
      try {
        const parsed = JSON.parse(mySignatureData.signatureData);
        if (parsed.type === "TYPED") {
          setSigType("type");
          setTypedName(parsed.name || "");
          setSelectedFont(parsed.font || "font-serif italic");
        }
      } catch {
        // Base64 drawing or image upload
        const dataUrl = mySignatureData.signatureData;
        setUploadedSigImage(dataUrl);
        setSigType("draw");
        const canvas = canvasRef.current;
        if (canvas) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            setHasDrawn(true);
          };
          img.src = dataUrl;
        }
      }
    }
  }, [mySignatureData]);

  const handleSigImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, SVG, WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Signature image size must be less than 5 MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedSigImage(result);
      toast({
        title: "Signature Image Loaded",
        description: "Your signature image has been loaded and ready to save.",
      });
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasDrawn(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveSignature = () => {
    let payload = "";
    if (sigType === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        toast({ title: "Empty Signature", description: "Please draw your signature before saving.", variant: "destructive" });
        return;
      }
      payload = canvas.toDataURL("image/png");
    } else if (sigType === "type") {
      if (!typedName.trim()) {
        toast({ title: "Name Required", description: "Please enter your name.", variant: "destructive" });
        return;
      }
      payload = JSON.stringify({ type: "TYPED", name: typedName.trim(), font: selectedFont });
    } else if (sigType === "upload") {
      if (!uploadedSigImage) {
        toast({ title: "Image Required", description: "Please select or drop a signature image before saving.", variant: "destructive" });
        return;
      }
      payload = uploadedSigImage;
    }
    signatureMutation.mutate({ signatureData: payload });
  };

  // ========================================================
  // 5. SETTINGS FORM STATE
  // ========================================================
  const [settingsForm, setSettingsForm] = useState({
    emailRemindersEnabled: true,
    reminderDays: 3,
    masterPasswordEnabled: false,
    masterPassword: "",
    customMessage: "Please review and electronically sign this document from your accounting team.",
    notifyOnSign: true,
    notifyOnDecline: true,
  });

  useEffect(() => {
    if (settingsData) {
      setSettingsForm({
        emailRemindersEnabled: Boolean(settingsData.emailRemindersEnabled),
        reminderDays: settingsData.reminderDays || 3,
        masterPasswordEnabled: Boolean(settingsData.masterPasswordEnabled),
        masterPassword: settingsData.masterPassword || "",
        customMessage: settingsData.customMessage || "Please review and electronically sign this document from your accounting team.",
        notifyOnSign: Boolean(settingsData.notifyOnSign),
        notifyOnDecline: Boolean(settingsData.notifyOnDecline),
      });
    }
  }, [settingsData]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    settingsMutation.mutate(settingsForm);
  };

  // ========================================================
  // 6. TEMPLATES MODAL STATE
  // ========================================================
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "Accounts Production",
    description: "",
  });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim()) return;
    createTemplateMutation.mutate({
      name: templateForm.name,
      category: templateForm.category,
      description: templateForm.description,
      fieldsJson: [
        { fieldType: "Signature", label: "Client Signature", page: 1, x: 25, y: 75, width: 25, height: 8 },
        { fieldType: "Date", label: "Date", page: 1, x: 65, y: 75, width: 20, height: 6 },
      ],
    });
  };

  // Copy Link Helper
  const handleCopyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link Copied!", description: "Public signature link copied to clipboard." });
  };

  return (
    <AppLayout sidebar={sidebar} module="eSign">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Top Header Bar */}
        <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200 shadow-xs">
          <div className="flex items-center text-xs text-slate-500 font-medium">
            <span
              onClick={() => navigate("/esign")}
              className="flex items-center gap-1.5 hover:text-purple-600 cursor-pointer transition-colors"
            >
              <FileSignature size={14} /> eSign Hub
            </span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-purple-700 font-bold capitalize">
              {currentTab === "overview" && "Document Overview"}
              {currentTab === "sign" && "Sign & Send Wizard"}
              {currentTab === "my-signature" && "My Signature Studio"}
              {currentTab === "templates" && "Templates Library"}
              {currentTab === "settings" && "Data Security & Settings"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/esign?tab=sign")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Send Document
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW & COMMAND DASHBOARD                       */}
          {/* ======================================================== */}
          {currentTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { label: "Total Documents", count: counts.total, color: "text-slate-800", bg: "bg-white", border: "border-slate-200" },
                  { label: "Awaiting Signature", count: counts.awaiting, color: "text-amber-600", bg: "bg-amber-50/50", border: "border-amber-200" },
                  { label: "Signed & Verified", count: counts.signed, color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-200" },
                  { label: "Declined", count: counts.declined, color: "text-rose-600", bg: "bg-rose-50/50", border: "border-rose-200" },
                  { label: "Drafts", count: counts.drafts, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
                  { label: "Cancelled", count: counts.cancelled, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
                ].map((kpi, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${kpi.border} ${kpi.bg} shadow-xs`}>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      {kpi.label}
                    </span>
                    <span className={`text-2xl font-black ${kpi.color}`}>
                      {isLoadingDocs ? "..." : kpi.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Filters & Actions Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {statusFilters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeFilter === s
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Search & Module Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={activeModuleFilter}
                    onChange={(e) => setActiveModuleFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
                  >
                    <option value="All">All Modules</option>
                    {sourceModules.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search title, signer, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-52 sm:w-64 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Documents Register Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Document Title</th>
                        <th className="py-3 px-4">Origin Module</th>
                        <th className="py-3 px-4">Signer / Recipient</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {isLoadingDocs ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Loading documents from database...
                          </td>
                        </tr>
                      ) : documents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center">
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-100">
                              <FileText size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">No Documents Found</h3>
                            <p className="text-slate-500 text-xs mb-4">
                              {search || activeFilter !== "All"
                                ? "No documents match the current filter criteria."
                                : "Start sending accounts, tax returns, and engagement letters for client e-signatures."}
                            </p>
                            <button
                              onClick={() => navigate("/esign?tab=sign")}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Plus size={14} /> Send Your First Document
                            </button>
                          </td>
                        </tr>
                      ) : (
                        documents.map((doc: any) => {
                          const isSigned = doc.status === "Signed";
                          const isAwaiting = doc.status === "AwaitingApproval" || doc.status === "Awaiting";
                          const isDeclined = doc.status === "Declined";
                          const isDraft = doc.status === "Draft";

                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 hover:text-purple-700 cursor-pointer" onClick={() => setSelectedDocId(doc.id)}>
                                  {doc.title}
                                </div>
                                {doc.isPasswordProtected && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium mt-0.5">
                                    <Lock size={10} /> Password Protected
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {doc.sourceModule || "Direct Upload"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-800">{doc.signerName || "Client Signer"}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{doc.signerEmail || "—"}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${isSigned
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isAwaiting
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : isDeclined
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : isDraft
                                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                                          : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                >
                                  {isSigned && <CheckCircle2 size={11} />}
                                  {isAwaiting && <Clock size={11} />}
                                  {isDeclined && <AlertCircle size={11} />}
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  {/* View / Details */}
                                  <button
                                    onClick={() => setSelectedDocId(doc.id)}
                                    title="View Details & Audit Trail"
                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Eye size={14} />
                                  </button>

                                  {/* Copy Link */}
                                  {doc.publicUrl && (
                                    <button
                                      onClick={() => handleCopyLink(doc.publicUrl)}
                                      title="Copy Client Signing Link"
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Copy size={14} />
                                    </button>
                                  )}

                                  {/* Download Stamped & Signed PDF Document */}
                                  {isSigned && (
                                    <a
                                      href={doc.signedFilePath || `/uploads/esign/signed_doc_${doc.id}.pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={`${doc.title}_Signed.pdf`}
                                      title="Download Signed Document (with Signature Stamped & Certificate)"
                                      className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <FileCheck size={14} />
                                    </a>
                                  )}

                                  {/* Download Signed Certificate */}
                                  {isSigned && (
                                    <button
                                      onClick={() => {
                                        const primarySigner = doc.signers?.[0];
                                        generatePdfCertificate({
                                          documentId: doc.id,
                                          title: doc.title,
                                          sourceModule: doc.sourceModule,
                                          createdAt: doc.createdAt,
                                          completedAt: doc.completedAt,
                                          verificationToken: doc.verificationToken,
                                          signerName: doc.signerName,
                                          signerEmail: doc.signerEmail,
                                          signerRole: doc.signerRole,
                                          ipAddress: primarySigner?.ipAddress,
                                          signatureData: primarySigner?.signatureData,
                                        });
                                      }}
                                      title="Download Official Audit Certificate (PDF)"
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Download size={14} />
                                    </button>
                                  )}

                                  {/* Resend Reminder */}
                                  {isAwaiting && (
                                    <button
                                      onClick={() => remindMutation.mutate(doc.id)}
                                      title="Send Reminder Notification"
                                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Send size={14} />
                                    </button>
                                  )}

                                  {/* Cancel / Delete */}
                                  <button
                                    onClick={() => deleteMutation.mutate(doc.id)}
                                    title="Delete Document"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: 4-STEP CAPISIGN CREATION WIZARD                    */}
          {/* ======================================================== */}
          {currentTab === "sign" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 sm:p-8 space-y-8">
              {/* Stepper Header */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  {[
                    { step: 1, label: "1. Select Document" },
                    { step: 2, label: "2. Add Signatories" },
                    { step: 3, label: "3. Field Placement" },
                    { step: 4, label: "4. Review & Dispatch" },
                  ].map((s) => (
                    <div
                      key={s.step}
                      onClick={() => setWizardStep(s.step)}
                      className={`flex-1 text-center py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${wizardStep === s.step
                        ? "border-purple-600 text-purple-700"
                        : wizardStep > s.step
                          ? "border-emerald-500 text-emerald-600"
                          : "border-slate-200 text-slate-400"
                        }`}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 1: SELECT / UPLOAD DOCUMENT */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Upload or Select Document</h3>
                    <p className="text-xs text-slate-500">Choose a document file, set source module, or attach from Media Library.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                      <input
                        type="text"
                        required
                        value={wizardForm.title}
                        onChange={(e) => setWizardForm({ ...wizardForm, title: e.target.value })}
                        placeholder="e.g. Annual Accounts Approval 2025/26"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Source Module</label>
                      <select
                        value={wizardForm.sourceModule}
                        onChange={(e) => setWizardForm({ ...wizardForm, sourceModule: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      >
                        {sourceModules.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Practice Client (Optional)</label>
                      <select
                        value={wizardForm.clientId}
                        onChange={(e) => handleClientSelect(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      >
                        <option value="">-- Select Client --</option>
                        {clientsList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName || c.clientName} ({c.clientType || "Ltd"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Attached Documents Section (Multiple PDFs) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Attached PDF Documents ({wizardForm.attachments?.length || (wizardForm.filePath ? 1 : 0)})
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Attach one or multiple PDF documents to include in this single signing envelope.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsMediaModalOpen(true)}
                          className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <FolderOpen size={13} /> Select from Media Library
                        </button>
                      </div>
                    </div>

                    {/* Multi-Attachment List */}
                    {wizardForm.attachments && wizardForm.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {wizardForm.attachments.map((att, attIdx) => {
                          const isPrimary = attIdx === 0;
                          return (
                            <div
                              key={attIdx}
                              className="bg-white border border-slate-200 hover:border-purple-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs transition-all"
                            >
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {attIdx + 1}
                                </span>
                                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0 border border-purple-100">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 truncate max-w-xs">{att.fileName}</span>
                                    {isPrimary && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                        Primary Doc
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                      <CheckCircle2 size={10} /> Ready
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {att.fileSize && att.fileSize > 1024 * 1024
                                      ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                      : `${Math.round((att.fileSize || 250000) / 1024)} KB`} • PDF Document
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {att.filePath && (
                                  <a
                                    href={
                                      att.filePath.startsWith("/uploads/")
                                        ? att.filePath
                                        : `/uploads/esign/${att.filePath}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink size={12} /> Preview
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(attIdx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="Remove attachment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Drag & Drop Empty Dropzone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files) handleMultiplePdfUpload(e.dataTransfer.files);
                        }}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer space-y-3 ${isDraggingFile
                          ? "border-purple-600 bg-purple-50/50 scale-[1.01]"
                          : "border-slate-300 hover:border-purple-400 hover:bg-purple-50/20"
                          }`}
                      >
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto">
                          {isUploadingLocal ? (
                            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload size={22} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {isUploadingLocal
                              ? "Uploading and processing PDF documents..."
                              : isDraggingFile
                                ? "Drop your PDF files here to attach"
                                : "Drag and drop one or multiple PDF documents here"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Accepts multiple PDFs (Annual Accounts, CT600, Engagement Letters - up to 25MB each)
                          </p>
                        </div>

                        <div className="inline-flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white border border-slate-300 hover:border-purple-400 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload size={12} className="text-purple-600" /> Upload from Computer
                          </button>
                          <span className="text-xs text-slate-400">or</span>
                          <button
                            type="button"
                            onClick={() => setIsMediaModalOpen(true)}
                            className="px-4 py-2 bg-white border border-slate-300 hover:border-purple-400 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FolderOpen size={12} className="text-purple-600" /> Select from Media Library
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={!wizardForm.title.trim() || (!wizardForm.attachments?.length && !wizardForm.filePath)}
                      onClick={() => setWizardStep(2)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs"
                    >
                      Next: Add Signatories <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ADD SIGNATORIES & SECURITY */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Add Signatories & Recipient Roles</h3>
                      <p className="text-xs text-slate-500">Specify who needs to sign or review this document.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSigner}
                      className="text-purple-600 hover:text-purple-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={13} /> Add Another Signer
                    </button>
                  </div>

                  <div className="space-y-3">
                    {signers.map((s, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Signer Full Name"
                            value={s.signerName}
                            onChange={(e) => updateSigner(idx, "signerName", e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <input
                            type="email"
                            required
                            placeholder="signer@example.com *"
                            value={s.signerEmail}
                            onChange={(e) => updateSigner(idx, "signerEmail", e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <select
                            value={s.signerRole}
                            onChange={(e) => updateSigner(idx, "signerRole", e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="Signer">Signer (Must Sign)</option>
                            <option value="Reviewer">Reviewer (Receives Copy)</option>
                            <option value="InPerson">In-Person Signer</option>
                          </select>
                        </div>
                        {signers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSigner(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Document Security Passcode Option */}
                  <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-purple-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Password Protection</span>
                          <span className="text-[11px] text-slate-500">Require signatories to enter an access passcode before viewing.</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={wizardForm.isPasswordProtected}
                        onChange={(e) => setWizardForm({ ...wizardForm, isPasswordProtected: e.target.checked })}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                      />
                    </div>
                    {wizardForm.isPasswordProtected && (
                      <div className="pt-2">
                        <input
                          type="text"
                          value={wizardForm.accessCode}
                          onChange={(e) => setWizardForm({ ...wizardForm, accessCode: e.target.value })}
                          placeholder="Set access passcode (e.g. 849201)"
                          className="w-full sm:w-64 px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-slate-600 hover:text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!signers.some((s) => s.signerEmail.trim())}
                      onClick={() => setWizardStep(3)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      Next: Field Placement <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: INTERACTIVE FIELD PLACEMENT STUDIO */}
              {wizardStep === 3 && (() => {
                const attachedDocs = (wizardForm.attachments && wizardForm.attachments.length > 0)
                  ? wizardForm.attachments
                  : wizardForm.filePath
                    ? [{ fileName: wizardForm.fileName || wizardForm.title || "Document 1", filePath: wizardForm.filePath, fileSize: wizardForm.fileSize }]
                    : [{ fileName: "Document 1", filePath: "", fileSize: 250000 }];

                const currentDoc = attachedDocs[activeDocIdx] || attachedDocs[0];
                const activeDocFields = fields.filter((f) => (f.fileIndex ?? 0) === activeDocIdx);
                const currentDocPages = docPageCounts[activeDocIdx] || numPages || 1;
                const totalDocPages = Math.max(1, currentDocPages);

                return (
                  <div className="space-y-6">
                    {/* Studio Header */}
                    <div className="pb-4 border-b border-slate-100 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Move size={16} className="text-purple-600" /> Interactive Field Placement Studio
                          </h3>
                          <p className="text-xs text-slate-500">
                            Switch documents from the dropdown, navigate pages via the right thumbnail strip, and click anywhere on the canvas to place tags.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100">
                            <FileText size={13} className="text-purple-600" /> {attachedDocs.length} Document(s) in Package
                          </span>
                        </div>
                      </div>

                      {/* Add Field Buttons - Single Clean Horizontal Line */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider text-[11px] mr-1">
                          Add New Tag:
                        </span>
                        {[
                          { type: "Signature", label: "Signature Tag", bg: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
                          { type: "My Signature", label: "My Signature", bg: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
                          { type: "Date", label: "Date Signed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                          { type: "Textbox", label: "Text Field", bg: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                          { type: "Initial", label: "Initial Tag", bg: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                        ].map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => addField(item.type)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs flex items-center gap-1.5 cursor-pointer ${item.bg}`}
                          >
                            <Plus size={12} /> {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2-Column Placement Studio Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* LEFT COLUMN: FIELD LIST & POSITION CONTROLS (4 cols) */}
                      <div className="lg:col-span-4 space-y-4">
                        {/* Active Tag Tabs */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Configured Tags ({fields.length})
                            </label>
                            <span className="text-[11px] text-purple-700 font-bold">
                              Doc {activeDocIdx + 1}: {activeDocFields.length} tags
                            </span>
                          </div>

                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {fields.map((f, idx) => {
                              const isActive = activeFieldIdx === idx;
                              const isMySig = f.fieldType === "My Signature";
                              const tagDocIdx = f.fileIndex ?? 0;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setActiveFieldIdx(idx);
                                    setActiveDocIdx(tagDocIdx);
                                    setPreviewPage(f.pageNumber);
                                  }}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                    ? isMySig
                                      ? "bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-400"
                                      : "bg-purple-50/80 border-purple-400 shadow-xs ring-1 ring-purple-400"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-[11px] ${isActive
                                      ? isMySig ? "bg-indigo-600 text-white" : "bg-purple-600 text-white"
                                      : isMySig ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"
                                      }`}>
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                                        {isMySig && <FileSignature size={12} className="text-indigo-600" />}
                                        {f.fieldType} Tag
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                                          Doc {tagDocIdx + 1}
                                        </span>
                                        <span>Page {f.pageNumber}</span>
                                        <span>• X:{f.coordX}%, Y:{f.coordY}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {fields.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeField(idx);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                        title="Delete Tag"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Tag Position & Settings Card */}
                        {fields[activeFieldIdx] && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                              <span className="text-xs font-bold text-slate-800">
                                Edit Tag #{activeFieldIdx + 1} ({fields[activeFieldIdx].fieldType})
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fields[activeFieldIdx].fieldType === "My Signature"
                                ? "text-indigo-700 bg-indigo-100"
                                : "text-purple-700 bg-purple-100"
                                }`}>
                                Page {fields[activeFieldIdx].pageNumber} (Doc {(fields[activeFieldIdx].fileIndex ?? 0) + 1})
                              </span>
                            </div>

                            {/* Target Document Selector */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Assigned Document File
                              </label>
                              <select
                                value={fields[activeFieldIdx].fileIndex ?? 0}
                                onChange={(e) => {
                                  const dIdx = parseInt(e.target.value) || 0;
                                  updateField(activeFieldIdx, { fileIndex: dIdx, pageNumber: 1 });
                                  setActiveDocIdx(dIdx);
                                  setPreviewPage(1);
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                              >
                                {attachedDocs.map((att, dIdx) => (
                                  <option key={dIdx} value={dIdx}>
                                    Doc {dIdx + 1}: {att.fileName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Assigned Signatory (Full Width - Page is selected via right thumbnails) */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Assigned Signatory
                              </label>
                              <select
                                value={fields[activeFieldIdx].signerIndex ?? 0}
                                onChange={(e) => updateField(activeFieldIdx, { signerIndex: parseInt(e.target.value) })}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800"
                              >
                                {signers.map((s, sIdx) => (
                                  <option key={sIdx} value={sIdx}>
                                    {s.signerName || `Signer ${sIdx + 1}`} ({s.signerRole || "Signatory"})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quick Placement Presets */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                                Quick Position Presets
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { id: "bottom-right", label: "Bottom Right" },
                                  { id: "bottom-left", label: "Bottom Left" },
                                  { id: "center", label: "Center Page" },
                                  { id: "top-right", label: "Top Right" },
                                ].map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setFieldPreset(activeFieldIdx, p.id as any)}
                                    className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Fine Coordinates Sliders */}
                            <div className="space-y-2.5 pt-1">
                              <div>
                                <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                                  <span>Horizontal Position (X)</span>
                                  <span className="font-mono text-purple-700 font-bold">{fields[activeFieldIdx].coordX}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="5"
                                  max="85"
                                  value={fields[activeFieldIdx].coordX}
                                  onChange={(e) => updateField(activeFieldIdx, { coordX: parseInt(e.target.value) })}
                                  className="w-full accent-purple-600 cursor-pointer"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                                  <span>Vertical Position (Y)</span>
                                  <span className="font-mono text-purple-700 font-bold">{fields[activeFieldIdx].coordY}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="5"
                                  max="90"
                                  value={fields[activeFieldIdx].coordY}
                                  onChange={(e) => updateField(activeFieldIdx, { coordY: parseInt(e.target.value) })}
                                  className="w-full accent-purple-600 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN: DOCUMENT SELECTOR DROPDOWN + VERTICAL PAGE STRIP + CANVAS PREVIEW (8 cols) */}
                      <div className="lg:col-span-8 space-y-3">
                        {/* Top Document Selector Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-100/90 p-2.5 rounded-xl border border-slate-200 gap-2">
                          {/* TOP-LEFT DOCUMENT SELECTOR DROPDOWN */}
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-xs shrink-0 flex items-center gap-1">
                              <FileText size={14} className="text-purple-600" /> Active Doc:
                            </span>
                            <select
                              value={activeDocIdx}
                              onChange={(e) => {
                                const idx = parseInt(e.target.value) || 0;
                                setActiveDocIdx(idx);
                                setPreviewPage(1);
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs max-w-[280px] sm:max-w-[340px] truncate cursor-pointer"
                            >
                              {attachedDocs.map((att, idx) => {
                                const docTagCount = fields.filter((f) => (f.fileIndex ?? 0) === idx).length;
                                return (
                                  <option key={idx} value={idx}>
                                    {idx + 1}. {att.fileName} ({docTagCount} {docTagCount === 1 ? "tag" : "tags"})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {currentDoc.filePath && (
                              <a
                                href={
                                  currentDoc.filePath.startsWith("/uploads/")
                                    ? currentDoc.filePath
                                    : `/uploads/esign/${currentDoc.filePath}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                title="Open current PDF document in a new tab"
                                className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                              >
                                <ExternalLink size={12} /> Open Full PDF
                              </a>
                            )}
                          </div>
                        </div>

                        {/* SUB-GRID: CANVAS (LEFT) + REAL PDF PAGE THUMBNAILS STRIP (RIGHT) */}
                        <div className="grid grid-cols-12 gap-3 items-start">
                          {/* LEFT MAIN CANVAS (9 cols) */}
                          <div className="col-span-12 sm:col-span-9 space-y-2">
                            {/* Interactive A4 Sheet Canvas */}
                            <div
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                if (fields[activeFieldIdx]) {
                                  updateField(activeFieldIdx, {
                                    fileIndex: activeDocIdx,
                                    pageNumber: previewPage,
                                    coordX: Math.max(5, Math.min(80, clickX - 15)),
                                    coordY: Math.max(5, Math.min(88, clickY - 5)),
                                  });
                                }
                              }}
                              className="relative bg-white border-2 border-slate-300 rounded-2xl shadow-md w-full aspect-[1/1.414] overflow-hidden cursor-crosshair select-none group"
                              title="Click anywhere on this page to position the active signature tag"
                              ref={canvasContainerRef}
                            >
                              {/* Live PDF Renderer via react-pdf/PDF.js */}
                              {currentDoc.filePath ? (
                                <Document
                                  file={
                                    currentDoc.filePath.startsWith("/uploads/")
                                      ? currentDoc.filePath
                                      : `/uploads/esign/${currentDoc.filePath}`
                                  }
                                  onLoadSuccess={(pdf) => {
                                    setDocPageCounts((prev) => ({ ...prev, [activeDocIdx]: pdf.numPages }));
                                    setNumPages(pdf.numPages);
                                  }}
                                  loading={
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/80">
                                      <Loader2 size={22} className="animate-spin text-purple-500" />
                                      <span className="text-[11px] text-slate-400 font-medium">Loading document...</span>
                                    </div>
                                  }
                                  error={
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/80">
                                      <FileText size={28} className="text-slate-300" />
                                      <span className="text-[11px] text-slate-400 font-medium">Could not load PDF preview</span>
                                      <a
                                        href={
                                          currentDoc.filePath.startsWith("/uploads/")
                                            ? currentDoc.filePath
                                            : `/uploads/esign/${currentDoc.filePath}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-purple-600 underline font-semibold"
                                      >
                                        Open PDF in new tab
                                      </a>
                                    </div>
                                  }
                                  className="absolute inset-0 w-full h-full pointer-events-none z-0 flex items-start justify-center overflow-hidden [&_.react-pdf__Page]:!w-full [&_.react-pdf__Page]:!h-full [&_.react-pdf__Page__canvas]:!w-full [&_.react-pdf__Page__canvas]:!h-full [&_.react-pdf__Page__canvas]:!object-contain"
                                >
                                  <Page
                                    pageNumber={previewPage}
                                    width={containerWidth || 650}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="w-full h-full max-w-full"
                                  />
                                </Document>
                              ) : (
                                <div className="p-6 space-y-4 opacity-50 pointer-events-none z-0 select-none">
                                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-300">
                                    <div>
                                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800 block truncate max-w-[280px]">
                                        {currentDoc.fileName || wizardForm.title || "STATUTORY REPORT & ACCOUNTS"}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-medium">Upload a PDF to see live preview</span>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                      Page {previewPage}
                                    </span>
                                  </div>
                                  <div className="space-y-2 pt-1">
                                    <div className="h-2 bg-slate-300 rounded-full w-4/5"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-11/12"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-3/4"></div>
                                  </div>
                                  <div className="pt-4 space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pb-1 border-b border-slate-200">
                                      <span>STATUTORY SECTION {previewPage}.1</span>
                                      <span>COMPLIANCE STATUS</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full w-full"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-5/6"></div>
                                    <div className="h-2 bg-slate-200 rounded-full w-2/3"></div>
                                  </div>
                                  <div className="pt-8 border-t border-dashed border-slate-300">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Director / Signatory Approval Area</span>
                                    <div className="h-1.5 bg-slate-200 rounded-full w-1/3"></div>
                                  </div>
                                </div>
                              )}

                              {/* Interactive Click Helper Overlay Hint */}
                              <div className="absolute top-3 right-3 bg-purple-900/85 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg pointer-events-none flex items-center gap-1 font-medium shadow-sm z-30">
                                <MousePointerClick size={12} /> Click on page to position Tag #{activeFieldIdx + 1}
                              </div>

                              {/* Render All Tags On This Page For The Active Document */}
                              {fields.map((f, idx) => {
                                if ((f.fileIndex ?? 0) !== activeDocIdx || f.pageNumber !== previewPage) return null;
                                const isActive = activeFieldIdx === idx;
                                const isMySig = f.fieldType === "My Signature";
                                const isSig = f.fieldType === "Signature";
                                const isDate = f.fieldType === "Date";
                                const isInitial = f.fieldType === "Initial";
                                const isText = f.fieldType === "Textbox";
                                const assignedSigner = signers[f.signerIndex ?? 0];

                                let colorTheme = {
                                  active: "bg-purple-600 text-white border-purple-500 ring-2 ring-purple-400 ring-offset-1 shadow-md z-30",
                                  inactive: "bg-purple-50/95 text-purple-900 border-purple-400 hover:bg-purple-100 hover:border-purple-500 shadow-2xs z-10",
                                  badgeActive: "bg-white/25 text-white",
                                  badgeInactive: "bg-purple-200/80 text-purple-800",
                                  icon: <PenTool size={11} className="shrink-0" />,
                                  shortLabel: "Sign",
                                };

                                if (isMySig) {
                                  colorTheme = {
                                    active: "bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400 ring-offset-1 shadow-md z-30",
                                    inactive: "bg-indigo-50/95 text-indigo-900 border-indigo-400 hover:bg-indigo-100 hover:border-indigo-500 shadow-2xs z-10",
                                    badgeActive: "bg-white/25 text-white",
                                    badgeInactive: "bg-indigo-200/80 text-indigo-800",
                                    icon: <FileSignature size={11} className="shrink-0" />,
                                    shortLabel: "My Sign",
                                  };
                                } else if (isDate) {
                                  colorTheme = {
                                    active: "bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-400 ring-offset-1 shadow-md z-30",
                                    inactive: "bg-emerald-50/95 text-emerald-900 border-emerald-400 hover:bg-emerald-100 hover:border-emerald-500 shadow-2xs z-10",
                                    badgeActive: "bg-white/25 text-white",
                                    badgeInactive: "bg-emerald-200/80 text-emerald-800",
                                    icon: <Calendar size={11} className="shrink-0" />,
                                    shortLabel: "Date",
                                  };
                                } else if (isInitial) {
                                  colorTheme = {
                                    active: "bg-amber-600 text-white border-amber-500 ring-2 ring-amber-400 ring-offset-1 shadow-md z-30",
                                    inactive: "bg-amber-50/95 text-amber-900 border-amber-400 hover:bg-amber-100 hover:border-amber-500 shadow-2xs z-10",
                                    badgeActive: "bg-white/25 text-white",
                                    badgeInactive: "bg-amber-200/80 text-amber-800",
                                    icon: <CheckSquare size={11} className="shrink-0" />,
                                    shortLabel: "Initial",
                                  };
                                } else if (isText) {
                                  colorTheme = {
                                    active: "bg-blue-600 text-white border-blue-500 ring-2 ring-blue-400 ring-offset-1 shadow-md z-30",
                                    inactive: "bg-blue-50/95 text-blue-900 border-blue-400 hover:bg-blue-100 hover:border-blue-500 shadow-2xs z-10",
                                    badgeActive: "bg-white/25 text-white",
                                    badgeInactive: "bg-blue-200/80 text-blue-800",
                                    icon: <Type size={11} className="shrink-0" />,
                                    shortLabel: "Text",
                                  };
                                }

                                const signerDisplay = isMySig
                                  ? "My Signature"
                                  : assignedSigner?.signerName
                                    ? assignedSigner.signerName.split(" ")[0]
                                    : `Signer ${(f.signerIndex ?? 0) + 1}`;

                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFieldIdx(idx);
                                    }}
                                    style={{
                                      left: `${f.coordX}%`,
                                      top: `${f.coordY}%`,
                                      width: `${f.width || (isSig || isMySig ? 24 : isDate ? 16 : isInitial ? 12 : 20)}%`,
                                      minWidth: "100px",
                                    }}
                                    className={`absolute h-7 px-2 border rounded-md transition-all cursor-move flex items-center justify-between gap-1 select-none backdrop-blur-xs text-[10px] font-semibold ${isActive ? colorTheme.active : colorTheme.inactive
                                      }`}
                                    title={`${f.fieldType} (${signerDisplay}) - Click to select or move`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0 truncate">
                                      {colorTheme.icon}
                                      <span className="font-bold uppercase tracking-wide truncate">
                                        {colorTheme.shortLabel}
                                      </span>
                                      <span className="opacity-80 truncate text-[9px] font-normal">
                                        ({signerDisplay})
                                      </span>
                                    </div>

                                    <span
                                      className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold shrink-0 ${isActive ? colorTheme.badgeActive : colorTheme.badgeInactive
                                        }`}
                                    >
                                      #{idx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <p className="text-[11px] text-slate-400 text-center">
                              Tags placed on this document will be stamped on the PDF upon electronic signing.
                            </p>
                          </div>

                          {/* RIGHT VERTICAL ORIGINAL PDF PAGE THUMBNAILS STRIP (3 cols) */}
                          <div className="col-span-12 sm:col-span-3 space-y-2 max-h-[620px] overflow-y-auto pr-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                              Page Thumbnails ({totalDocPages})
                            </div>
                            {Array.from({ length: totalDocPages }, (_, i) => i + 1).map((pageNum) => {
                              const isSelectedPage = previewPage === pageNum;
                              const pageTags = fields.filter(
                                (f) => (f.fileIndex ?? 0) === activeDocIdx && f.pageNumber === pageNum
                              );
                              return (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => {
                                    setPreviewPage(pageNum);
                                    if (fields[activeFieldIdx]) {
                                      updateField(activeFieldIdx, { fileIndex: activeDocIdx, pageNumber: pageNum });
                                    }
                                  }}
                                  className={`w-full text-left p-1.5 rounded-xl border transition-all cursor-pointer group ${isSelectedPage
                                    ? "bg-purple-50 border-purple-600 shadow-xs ring-2 ring-purple-600"
                                    : "bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                                    }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[10px] font-bold font-mono ${isSelectedPage ? "text-purple-700" : "text-slate-600"}`}>
                                      Page {pageNum}
                                    </span>
                                    {pageTags.length > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-800">
                                        {pageTags.length} {pageTags.length === 1 ? "tag" : "tags"}
                                      </span>
                                    )}
                                  </div>

                                  {/* Real PDF Page Miniature Preview */}
                                  <div className={`w-full aspect-[1/1.414] rounded-lg overflow-hidden border relative flex items-center justify-center bg-white ${isSelectedPage ? "border-purple-400 shadow-2xs" : "border-slate-200"
                                    }`}>
                                    {currentDoc.filePath ? (
                                      <div className="w-full h-full flex items-center justify-center pointer-events-none overflow-hidden select-none bg-white">
                                        <Document
                                          file={
                                            currentDoc.filePath.startsWith("/uploads/")
                                              ? currentDoc.filePath
                                              : `/uploads/esign/${currentDoc.filePath}`
                                          }
                                          loading={
                                            <div className="text-[9px] text-slate-400 animate-pulse font-mono flex items-center justify-center p-2">
                                              P.{pageNum}
                                            </div>
                                          }
                                          error={
                                            <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center p-2">
                                              P.{pageNum}
                                            </div>
                                          }
                                          className="w-full h-full flex items-center justify-center pointer-events-none [&_.react-pdf__Page]:!w-full [&_.react-pdf__Page]:!h-full [&_.react-pdf__Page__canvas]:!w-full [&_.react-pdf__Page__canvas]:!h-full [&_.react-pdf__Page__canvas]:!object-contain"
                                        >
                                          <Page
                                            pageNumber={pageNum}
                                            width={240}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            className="max-w-full max-h-full object-contain"
                                            error={
                                              <div className="text-[9px] text-slate-400 font-mono flex items-center justify-center p-2">
                                                Page {pageNum}
                                              </div>
                                            }
                                          />
                                        </Document>
                                      </div>
                                    ) : (
                                      <div className="p-2 text-center text-[10px] text-slate-400 font-medium">Page {pageNum}</div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="text-slate-600 hover:text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Back to Signatories
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        Next: Review & Dispatch <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* STEP 4: REVIEW & DISPATCH */}
              {wizardStep === 4 && (() => {
                const attachedDocs = (wizardForm.attachments && wizardForm.attachments.length > 0)
                  ? wizardForm.attachments
                  : wizardForm.filePath
                    ? [{ fileName: wizardForm.fileName || wizardForm.title || "Document 1", filePath: wizardForm.filePath, fileSize: wizardForm.fileSize }]
                    : [];

                return (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Review & Send Invitation</h3>
                      <p className="text-xs text-slate-500">Select an email template, verify attached documents, and dispatch the signing package.</p>
                    </div>

                    {/* Multi-Document Attachments Summary Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Attached Documents ({attachedDocs.length})
                        </span>
                        <span className="text-[11px] text-purple-700 font-bold">
                          {fields.length} Total Tags Placed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attachedDocs.map((att, idx) => {
                          const docTags = fields.filter((f) => (f.fileIndex ?? 0) === idx);
                          return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 block truncate">{att.fileName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {att.fileSize && att.fileSize > 1024 * 1024
                                      ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                      : `${Math.round((att.fileSize || 250000) / 1024)} KB`}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                                {docTags.length} {docTags.length === 1 ? "tag" : "tags"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dynamic Email Template Customizer Card in Review & Dispatch */}
                    <div className="p-5 bg-purple-50/40 border border-purple-200 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-purple-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Signatory Invitation Email Template</span>
                            <span className="text-[11px] text-slate-500">Select a template preset or customize the invitation message directly.</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                          Dynamic Template Active
                        </span>
                      </div>

                      {/* Template Selector Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Choose Email Template Preset
                        </label>
                        <select
                          value={wizardForm.templateId}
                          onChange={(e) => handleSelectEmailTemplate(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                        >
                          <optgroup label="Standard Statutory Accounting Templates">
                            {defaultEmailTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.category})
                              </option>
                            ))}
                          </optgroup>
                          {templatesList.length > 0 && (
                            <optgroup label="Custom Practice Templates">
                              {templatesList.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.category || "Custom"})
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Email Subject */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Subject Line</label>
                        <input
                          type="text"
                          value={wizardForm.emailSubject}
                          onChange={(e) => setWizardForm({ ...wizardForm, emailSubject: e.target.value })}
                          placeholder="Signature Request: {{documentTitle}} from {{firmName}}"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />
                      </div>

                      {/* Email Body Content */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Body Content</label>
                        <textarea
                          rows={4}
                          value={wizardForm.emailCustomBody}
                          onChange={(e) => setWizardForm({ ...wizardForm, emailCustomBody: e.target.value })}
                          placeholder="Dear {{signerName}}..."
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px] leading-relaxed"
                        />
                      </div>

                      {/* Token Helper Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Available Tokens:</span>
                        {["{{signerName}}", "{{documentTitle}}", "{{firmName}}", "{{signingUrl}}", "{{expiresAt}}"].map((tok) => (
                          <span key={tok} className="px-1.5 py-0.5 bg-white border border-slate-200 text-purple-700 text-[10px] rounded font-mono shadow-2xs">
                            {tok}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Message for Signatories</label>
                        <textarea
                          rows={2}
                          value={wizardForm.message}
                          onChange={(e) => setWizardForm({ ...wizardForm, message: e.target.value })}
                          placeholder="Optional notes or instructions for the signatory..."
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Period</label>
                          <select
                            value={wizardForm.expiryDays}
                            onChange={(e) => setWizardForm({ ...wizardForm, expiryDays: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                          >
                            <option value="7">7 Days</option>
                            <option value="14">14 Days (Standard)</option>
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                          </select>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                          <span className="font-semibold text-slate-700 block">Signatories ({signers.filter((s) => s.signerEmail).length}):</span>
                          <div className="space-y-1 text-slate-500 text-[11px]">
                            {signers.filter((s) => s.signerEmail).map((s, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between">
                                <span>{s.signerName || "Signatory"} ({s.signerEmail})</span>
                                <span className="text-purple-700 font-semibold">{s.signerRole}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="text-slate-600 hover:text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDispatchWizard(true)}
                          className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          disabled={createDocMutation.isPending}
                          onClick={() => handleDispatchWizard(false)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {createDocMutation.isPending ? "Dispatching..." : (
                            <>
                              <Send size={14} /> Send for E-Signature
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MY SIGNATURE STUDIO                                */}
          {/* ======================================================== */}
          {currentTab === "my-signature" && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">My Electronic Signature</h2>
                  <p className="text-xs text-slate-500">Configure your personal signature style to apply to client proposals and accounts.</p>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setSigType("draw")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${sigType === "draw" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Edit3 size={13} /> Draw
                  </button>
                  <button
                    onClick={() => setSigType("type")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${sigType === "type" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <LayoutTemplate size={13} /> Type
                  </button>
                  <button
                    onClick={() => setSigType("upload")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${sigType === "upload" ? "bg-white text-purple-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <Upload size={13} /> Upload Image
                  </button>
                </div>
              </div>

              {sigType === "draw" && (
                <div className="space-y-3">
                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={550}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={() => setIsDrawing(false)}
                      onMouseLeave={() => setIsDrawing(false)}
                      className="w-full h-[180px] cursor-crosshair"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-medium">
                        Draw your signature here...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Draw with mouse or pen</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} /> Clear Canvas
                    </button>
                  </div>
                </div>
              )}

              {sigType === "type" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "font-serif italic", name: "Classic Cursive" },
                      { id: "font-mono italic", name: "Modern Cursive" },
                    ].map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFont(f.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedFont === f.id
                          ? "border-purple-600 bg-purple-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">{f.name}</span>
                        <div className={`text-xl text-slate-800 truncate ${f.id}`}>
                          {typedName || "Sample Signature"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sigType === "upload" && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={sigImageInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSigImageFile(file);
                    }}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />

                  {uploadedSigImage ? (
                    <div className="border-2 border-slate-200 rounded-2xl bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 size={14} className="text-emerald-600" /> Signature Image Loaded
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedSigImage(null);
                            if (sigImageInputRef.current) sigImageInputRef.current.value = "";
                          }}
                          className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Replace Image
                        </button>
                      </div>

                      {/* Signature Preview Canvas Card */}
                      <div className="h-44 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-4 overflow-hidden relative shadow-inner">
                        <img
                          src={uploadedSigImage}
                          alt="Uploaded Signature"
                          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 text-center">
                        This signature image will be cleanly stamped onto statutory reports and document approval fields.
                      </p>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingSigImage(true);
                      }}
                      onDragLeave={() => setIsDraggingSigImage(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingSigImage(false);
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) handleSigImageFile(dropped);
                      }}
                      onClick={() => sigImageInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer space-y-3 ${isDraggingSigImage
                        ? "border-purple-600 bg-purple-50/50 scale-[1.01]"
                        : "border-slate-300 hover:border-purple-400 hover:bg-purple-50/20"
                        }`}
                    >
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto">
                        <Upload size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {isDraggingSigImage ? "Drop your signature image here" : "Click to browse or drag & drop signature image"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          PNG, JPG, SVG or WebP with transparent background recommended (up to 5MB)
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs hover:bg-purple-50 transition-colors pointer-events-none"
                      >
                        Browse Image File
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  disabled={signatureMutation.isPending}
                  onClick={handleSaveSignature}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} /> Save Signature Profile
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: TEMPLATES LIBRARY                                 */}
          {/* ======================================================== */}
          {currentTab === "templates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Pre-Configured Document Templates</h2>
                  <p className="text-xs text-slate-500">Fast-track signature requests with compliant UK accounting templates.</p>
                </div>
                <button
                  onClick={() => setIsNewTemplateModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus size={14} /> Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesList.map((tpl: any) => (
                  <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-purple-100">
                          {tpl.category || "General"}
                        </span>
                        {tpl.practiceId !== 1 && (
                          <button
                            onClick={() => deleteTemplateMutation.mutate(tpl.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">{tpl.name}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {tpl.description || "Pre-configured template with interactive digital signature fields."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {Array.isArray(tpl.fieldsJson) ? `${tpl.fieldsJson.length} Fields Configured` : "Standard Fields"}
                      </span>
                      <button
                        onClick={() => handleUseTemplate(tpl)}
                        className="text-purple-600 hover:text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Use Template <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DATA SECURITY & SETTINGS                          */}
          {/* ======================================================== */}
          {currentTab === "settings" && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">eSign Data Security & Settings</h2>
                <p className="text-xs text-slate-500">Configure global document security, automatic reminders, and notification rules.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Master Password Protection */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Default Master Password Protection</span>
                      <span className="text-[11px] text-slate-500">Automatically protect newly uploaded client documents with a passcode.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.masterPasswordEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, masterPasswordEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                  </div>
                  {settingsForm.masterPasswordEnabled && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Practice Master Passcode</label>
                      <input
                        type="text"
                        value={settingsForm.masterPassword}
                        onChange={(e) => setSettingsForm({ ...settingsForm, masterPassword: e.target.value })}
                        placeholder="e.g. eSignSecure2026"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Email Reminders */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Automated Email Reminders</span>
                      <span className="text-[11px] text-slate-500">Automatically remind clients if documents remain unsigned.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.emailRemindersEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, emailRemindersEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                  </div>
                  {settingsForm.emailRemindersEnabled && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Interval</label>
                      <select
                        value={settingsForm.reminderDays}
                        onChange={(e) => setSettingsForm({ ...settingsForm, reminderDays: parseInt(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                      >
                        <option value={3}>Every 3 Days</option>
                        <option value={5}>Every 5 Days</option>
                        <option value={7}>Every 7 Days (Weekly)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Notification Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <span className="text-xs text-slate-700 font-medium">Send email notification when client completes e-signing</span>
                    <input
                      type="checkbox"
                      checked={settingsForm.notifyOnSign}
                      onChange={(e) => setSettingsForm({ ...settingsForm, notifyOnSign: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <span className="text-xs text-slate-700 font-medium">Send email notification if client declines document</span>
                    <input
                      type="checkbox"
                      checked={settingsForm.notifyOnDecline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, notifyOnDecline: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Default Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Client Invitation Message</label>
                  <textarea
                    rows={3}
                    value={settingsForm.customMessage}
                    onChange={(e) => setSettingsForm({ ...settingsForm, customMessage: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={settingsMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} /> Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* DOCUMENT DETAILS & AUDIT TRAIL MODAL                      */}
        {/* ======================================================== */}
        {selectedDocId && docDetail && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                    {docDetail.sourceModule || "Direct Upload"}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{docDetail.title}</h3>
                  <p className="text-xs text-slate-400">Created {new Date(docDetail.createdAt).toLocaleString("en-GB")}</p>
                </div>
                <button
                  onClick={() => setSelectedDocId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Signers List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Signatories & Recipients</h4>
                <div className="space-y-2">
                  {docDetail.signers?.map((s: any) => (
                    <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{s.signerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.signerEmail}</div>
                        {s.signedAt && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Signed on {new Date(s.signedAt).toLocaleString("en-GB")} (IP: {s.ipAddress || "Verified"})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === "Signed"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "Declined"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                          {s.status}
                        </span>
                        {s.verificationToken && (
                          <button
                            onClick={() => handleCopyLink(`/esign/public/${s.verificationToken}`)}
                            title="Copy Signing Link"
                            className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Trail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Shield size={13} className="text-purple-600" /> Digital Audit Log (eIDAS Compliant)
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {docDetail.auditLogs && docDetail.auditLogs.length > 0 ? (
                    docDetail.auditLogs.map((log: any) => (
                      <div key={log.id} className="p-3 flex items-start gap-3 bg-white">
                        <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 size={12} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{log.action}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleString("en-GB")}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">{log.details}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => cancelMutation.mutate(docDetail.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Cancel Signing Request
                </button>
                <div className="flex items-center gap-2">
                  {docDetail.status === "Signed" && (
                    <>
                      <a
                        href={docDetail.signedFilePath || `/uploads/esign/signed_doc_${docDetail.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        download={`${docDetail.title}_Signed.pdf`}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <FileCheck size={12} /> Download Signed PDF
                      </a>

                      <button
                        onClick={() => {
                          const primarySigner = docDetail.signers?.[0];
                          generatePdfCertificate({
                            documentId: docDetail.id,
                            title: docDetail.title,
                            sourceModule: docDetail.sourceModule,
                            createdAt: docDetail.createdAt,
                            completedAt: docDetail.completedAt,
                            verificationToken: primarySigner?.verificationToken,
                            signerName: primarySigner?.signerName || "Client Signer",
                            signerEmail: primarySigner?.signerEmail || "",
                            signerRole: primarySigner?.signerRole || "Signer",
                            ipAddress: primarySigner?.ipAddress,
                            signatureData: primarySigner?.signatureData,
                            auditLogs: docDetail.auditLogs,
                          });
                        }}
                        className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download size={12} /> Audit Certificate (PDF)
                      </button>
                    </>
                  )}
                  {docDetail.status !== "Signed" && (
                    <button
                      onClick={() => remindMutation.mutate(docDetail.id)}
                      className="px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send size={12} /> Send Reminder
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDocId(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW TEMPLATE MODAL */}
        {isNewTemplateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Create New Template</h3>
                <button onClick={() => setIsNewTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. VAT Registration Authorization"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none bg-white"
                  >
                    {sourceModules.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Brief description of the template scope..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsNewTemplateModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTemplateMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Media Library Modal for Document File Picker */}
        <GlobalMediaLibraryModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onSelectFile={handleMediaSelect}
          allowedTypes="PDF & Documents"
        />

      </div>
    </AppLayout>
  );
}
