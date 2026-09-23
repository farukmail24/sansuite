import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Unlink,
  Code,
  Palette,
  Eye,
  Save,
  Download,
  Check,
  ChevronDown,
  FileText,
} from "lucide-react";

interface CKEditor3InvoiceEditorProps {
  pdfForm: any;
  setPdfForm: React.Dispatch<React.SetStateAction<any>>;
  logoPreview: string | null;
  onPreview: () => void;
  onSave: () => void;
  isSaving: boolean;
  onDownload: () => void;
}

export const CKEditor3InvoiceEditor: React.FC<CKEditor3InvoiceEditorProps> = ({
  pdfForm,
  setPdfForm,
  logoPreview,
  onPreview,
  onSave,
  isSaving,
  onDownload,
}) => {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [isFooterSourceMode, setIsFooterSourceMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"text" | "bg" | null>(null);
  const [showFooterColorPicker, setShowFooterColorPicker] = useState<"text" | "bg" | null>(null);

  const mainEditorRef = useRef<HTMLDivElement>(null);
  const footerEditorRef = useRef<HTMLDivElement>(null);

  // Execute standard formatting commands
  const executeCommand = (command: string, value: string | undefined = undefined, isFooter = false) => {
    const editor = isFooter ? footerEditorRef.current : mainEditorRef.current;
    if (editor) {
      editor.focus();
    }
    document.execCommand(command, false, value);
    setShowColorPicker(null);
    setShowFooterColorPicker(null);
  };

  const insertLink = (isFooter = false) => {
    const url = prompt("Enter the URL:", "https://");
    if (url) {
      executeCommand("createLink", url, isFooter);
    }
  };

  // Dynamic Floating CKEditor Magicline State
  const [magicLine, setMagicLine] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
    targetEl?: HTMLElement | null;
    position: "before" | "after";
  }>({
    visible: false,
    top: 0,
    left: 0,
    width: 0,
    targetEl: null,
    position: "after",
  });

  // Track mouse movement across all lines and blocks
  const handleEditorMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const editor = mainEditorRef.current;
    if (!editor) return;

    const editorRect = editor.getBoundingClientRect();
    const children = Array.from(editor.children) as HTMLElement[];
    const clientY = e.clientY;

    let found = false;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const rect = child.getBoundingClientRect();

      // Check if mouse is hovering near top or bottom boundary of this block
      const isNearTop = Math.abs(clientY - rect.top) <= 14;
      const isNearBottom = Math.abs(clientY - rect.bottom) <= 14;

      if (isNearTop) {
        setMagicLine({
          visible: true,
          top: rect.top - editorRect.top + editor.scrollTop - 2,
          left: rect.left - editorRect.left,
          width: rect.width || editorRect.width - 40,
          targetEl: child,
          position: "before",
        });
        found = true;
        break;
      } else if (isNearBottom) {
        setMagicLine({
          visible: true,
          top: rect.bottom - editorRect.top + editor.scrollTop - 2,
          left: rect.left - editorRect.left,
          width: rect.width || editorRect.width - 40,
          targetEl: child,
          position: "after",
        });
        found = true;
        break;
      }
    }

    if (!found) {
      setMagicLine((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }
  };

  const handleEditorMouseLeave = () => {
    setMagicLine((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const handleMagicLineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!magicLine.targetEl || !mainEditorRef.current) return;

    const newParagraph = document.createElement("div");
    newParagraph.className = "py-1 text-[11px] text-slate-800 focus:outline-none min-h-[22px] border border-dashed border-purple-300 px-2 rounded bg-purple-50/20";
    newParagraph.contentEditable = "true";
    newParagraph.innerHTML = "<br/>";

    if (magicLine.position === "before") {
      magicLine.targetEl.parentNode?.insertBefore(newParagraph, magicLine.targetEl);
    } else {
      magicLine.targetEl.parentNode?.insertBefore(newParagraph, magicLine.targetEl.nextSibling);
    }

    newParagraph.focus();
    setMagicLine((prev) => ({ ...prev, visible: false }));
  };

  const standardColors = [
    "#000000", "#444444", "#666666", "#999999", "#cccccc", "#ffffff",
    "#ff0000", "#ff7700", "#ffdd00", "#00aa00", "#0088ff", "#6600ff",
    "#0ea5e9", "#10b981", "#1e3a8a", "#6c5ce7", "#0f172a", "#e11d48",
  ];

  const mergeTags = [
    { label: "Company Name", tag: "[cmp_name]" },
    { label: "Company Address", tag: "[cmp_address]" },
    { label: "Company Phone", tag: "[cmp_phone]" },
    { label: "Company Reg No", tag: "[com_refno]" },
    { label: "VAT Reg No", tag: "[com_vatregno]" },
    { label: "Invoice Title", tag: "[inv_title]" },
    { label: "Report Title", tag: "[inv_report_title]" },
    { label: "Client Name", tag: "[cnt_name]" },
    { label: "Client Address", tag: "[cnt_address]" },
    { label: "Invoice Number", tag: "[inv_no]" },
    { label: "Invoice Date", tag: "[inv_date]" },
    { label: "Due Date", tag: "[due_date]" },
    { label: "Bank Name", tag: "[bank_name]" },
    { label: "Account No", tag: "[account_no]" },
    { label: "Sort Code", tag: "[sort_code]" },
    { label: "Footer Text", tag: "[footer_txt]" },
  ];

  const insertTag = (tag: string, isFooter = false) => {
    executeCommand("insertText", tag, isFooter);
  };

  return (
    <div className="space-y-4">
      {/* CKEDITOR 3 CONTAINER */}
      <div className="bg-white rounded border border-[#b6b6b6] shadow-xs overflow-hidden cke_editor3_wrapper font-sans">
        
        {/* ========================================================================= */}
        {/* MAIN CKEDITOR 3 TOOLBAR (Exact Kama/Moono Classic Skin)                   */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-b from-[#f7f7f7] via-[#efefef] to-[#dfdfdf] border-b border-[#cfcfcf] px-2 py-1.5 flex flex-wrap items-center gap-1 text-xs select-none shadow-2xs">
          
          {/* B, I, U Button Group */}
          <div className="flex items-center bg-white/70 border border-[#c4c4c4] rounded-xs shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand("bold")}
              className="px-2 py-1 hover:bg-[#e6e6e6] active:bg-[#d0d0d0] text-slate-800 font-bold border-r border-[#dedede] text-xs transition"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic")}
              className="px-2 py-1 hover:bg-[#e6e6e6] active:bg-[#d0d0d0] text-slate-800 italic font-serif border-r border-[#dedede] text-xs transition"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline")}
              className="px-2 py-1 hover:bg-[#e6e6e6] active:bg-[#d0d0d0] text-slate-800 underline text-xs transition"
              title="Underline (Ctrl+U)"
            >
              U
            </button>
          </div>

          {/* Link / Unlink Group */}
          <div className="flex items-center bg-white/70 border border-[#c4c4c4] rounded-xs shadow-2xs">
            <button
              type="button"
              onClick={() => insertLink(false)}
              className="p-1 hover:bg-[#e6e6e6] active:bg-[#d0d0d0] text-slate-700 border-r border-[#dedede] transition"
              title="Insert Link"
            >
              <LinkIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("unlink")}
              className="p-1 hover:bg-[#e6e6e6] active:bg-[#d0d0d0] text-slate-700 transition"
              title="Unlink"
            >
              <Unlink size={13} />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#c4c4c4] mx-0.5" />

          {/* Styles Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("formatBlock", e.target.value);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option value="">Styles -</option>
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          {/* Format (DIV) Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("formatBlock", e.target.value);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option value="div">Normal (DIV) -</option>
            <option value="p">Paragraph</option>
            <option value="pre">Formatted</option>
            <option value="address">Address</option>
          </select>

          {/* Font Family Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("fontName", e.target.value);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option value="">Font -</option>
            <option value="Arial, Helvetica, sans-serif">Arial</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="'Courier New', Courier, monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Tahoma, Geneva, sans-serif">Tahoma</option>
            <option value="Verdana, Geneva, sans-serif">Verdana</option>
            <option value="'Trebuchet MS', Helvetica, sans-serif">Trebuchet MS</option>
          </select>

          {/* Font Size Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("fontSize", e.target.value);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option value="">Size -</option>
            <option value="1">8 pt</option>
            <option value="2">10 pt</option>
            <option value="3">12 pt</option>
            <option value="4">14 pt</option>
            <option value="5">18 pt</option>
            <option value="6">24 pt</option>
            <option value="7">36 pt</option>
          </select>

          <div className="h-5 w-[1px] bg-[#c4c4c4] mx-0.5" />

          {/* Text Color Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(showColorPicker === "text" ? null : "text")}
              className="flex items-center gap-0.5 border border-[#c4c4c4] bg-white px-2 py-1 rounded-xs hover:bg-slate-50 text-[11px] font-bold text-slate-800 shadow-2xs"
              title="Text Color"
            >
              <span className="underline decoration-purple-600 font-serif">A</span>
              <ChevronDown size={10} className="text-slate-500" />
            </button>

            {showColorPicker === "text" && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-300 p-2 rounded shadow-lg grid grid-cols-6 gap-1 w-36 animate-in fade-in">
                {standardColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => executeCommand("foreColor", c)}
                    className="w-4 h-4 rounded-2xs border border-slate-300 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Background Color Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(showColorPicker === "bg" ? null : "bg")}
              className="flex items-center gap-0.5 border border-[#c4c4c4] bg-white px-2 py-1 rounded-xs hover:bg-slate-50 text-[11px] font-bold text-slate-800 shadow-2xs"
              title="Background Color"
            >
              <span className="bg-yellow-200 px-0.5 rounded-2xs font-serif">A</span>
              <ChevronDown size={10} className="text-slate-500" />
            </button>

            {showColorPicker === "bg" && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-300 p-2 rounded shadow-lg grid grid-cols-6 gap-1 w-36 animate-in fade-in">
                {standardColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => executeCommand("hiliteColor", c)}
                    className="w-4 h-4 rounded-2xs border border-slate-300 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-[#c4c4c4] mx-0.5" />

          {/* Merge Tags Quick Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertTag(e.target.value);
                e.target.value = "";
              }
            }}
            className="border border-purple-300 bg-purple-50 text-purple-800 rounded-xs px-2 py-1 text-[11px] font-semibold shadow-2xs cursor-pointer focus:outline-hidden"
          >
            <option value="">+ Insert Tag</option>
            {mergeTags.map((m) => (
              <option key={m.tag} value={m.tag}>
                {m.label} ({m.tag})
              </option>
            ))}
          </select>

          {/* Source Toggle */}
          <button
            type="button"
            onClick={() => setIsSourceMode(!isSourceMode)}
            className={`flex items-center gap-1 border border-[#c4c4c4] px-2 py-1 rounded-xs text-[11px] transition shadow-2xs ml-auto ${
              isSourceMode ? "bg-purple-600 text-white font-bold" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Source Code View"
          >
            <Code size={12} />
            <span>Source</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MAIN WYSIWYG CANVAS (Header & Body matching Capium BlueSky / SeaGreen)   */}
        {/* ========================================================================= */}
        <div
          className="relative p-6 bg-white min-h-[460px] text-xs select-text overflow-hidden"
          onMouseMove={handleEditorMouseMove}
          onMouseLeave={handleEditorMouseLeave}
        >
          {/* Floating Dynamic CKEditor Magicline (Moves across ANY line/block smoothly) */}
          {magicLine.visible && (
            <div
              style={{
                top: `${magicLine.top}px`,
                left: `${magicLine.left}px`,
                width: `${magicLine.width}px`,
              }}
              onClick={handleMagicLineClick}
              className="absolute z-30 pointer-events-auto cursor-pointer flex items-center gap-1 text-red-600 select-none group/magic transition-all duration-75 hover:opacity-100"
              title="Click to insert new paragraph / line (CKEditor Magicline)"
            >
              <span className="text-[10px] leading-none shrink-0 font-mono group-hover/magic:scale-125 transition-transform text-red-600">
                ▶
              </span>
              <div className="flex-1 border-b border-dotted border-red-500 h-0" />
              <span className="text-[11px] leading-none shrink-0 font-mono font-bold bg-red-50 px-1 py-0.5 rounded-2xs border border-red-300 shadow-xs group-hover/magic:scale-125 transition-transform text-red-600">
                ↵
              </span>
              <span className="text-[10px] leading-none shrink-0 font-mono group-hover/magic:scale-125 transition-transform text-red-600">
                ◀
              </span>
            </div>
          )}

          {isSourceMode ? (
            <textarea
              value={pdfForm.headerHtml || `<div class="invoice-header">\n  <!-- Edit HTML directly -->\n</div>`}
              onChange={(e) => setPdfForm({ ...pdfForm, headerHtml: e.target.value })}
              className="w-full h-96 font-mono text-xs p-3 border border-slate-300 rounded bg-slate-900 text-emerald-400 focus:outline-hidden"
            />
          ) : (
            <div
              ref={mainEditorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              className="space-y-4 focus:outline-hidden min-h-[400px] border border-transparent hover:border-slate-100 p-2 rounded"
            >
              {/* Row 1: Logo on Left & Practice Legal Details on Right */}
              <div className="flex items-start justify-between">
                {/* [logo] Placeholder / Logo */}
                <div className="text-slate-400 font-mono text-xs border border-dashed border-slate-300 px-4 py-2.5 rounded bg-slate-50/50 flex items-center justify-center min-w-[120px]">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="max-h-12 max-w-[130px] object-contain"
                    />
                  ) : (
                    <span className="font-semibold text-slate-500">[logo]</span>
                  )}
                </div>

                {/* Top-Right Practice Details */}
                <div className="text-right space-y-0.5 text-[11px]">
                  <div
                    className="font-bold text-sm"
                    style={{ color: pdfForm.primaryColor || "#0ea5e9" }}
                  >
                    [cmp_name]
                  </div>
                  <div className="text-slate-600">[cmp_address]</div>
                  <div className="text-slate-600">[cmp_phone]</div>
                  {pdfForm.companyRegNo && (
                    <div className="font-bold text-slate-800 pt-0.5">
                      Company Reg. No. : <span className="font-normal font-mono text-slate-600">[com_refno]</span>
                    </div>
                  )}
                  {pdfForm.vatRegNo && (
                    <div className="font-bold text-slate-800">
                      VAT Reg. No. : <span className="font-normal font-mono text-slate-600">[com_vatregno]</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Full-Width Title Bar Banner (Screenshots: BlueSky / SeaGreen Banner) */}
              <div
                className="w-full py-2.5 px-4 rounded-xs transition-colors duration-300 flex items-center justify-end"
                style={{ backgroundColor: pdfForm.primaryColor || "#0ea5e9" }}
              >
                <span className="text-xl font-bold tracking-wider text-white font-sans uppercase">
                  [inv_title]
                </span>
              </div>

              {/* Row 3: Client Info on Left & Invoice Details on Right */}
              <div className="grid grid-cols-2 gap-6 text-[11px] pt-1">
                {/* Client Information */}
                <div className="space-y-0.5">
                  <div
                    className="font-bold"
                    style={{ color: pdfForm.primaryColor || "#0ea5e9" }}
                  >
                    [inv_report_title]
                  </div>
                  <div className="font-bold text-slate-900">[cnt_name]</div>
                  <div className="text-slate-600">[cnt_address]</div>
                </div>

                {/* Invoice Metadata (Number, Date, Due Date) */}
                <div className="text-right space-y-1 font-mono text-[11px]">
                  <div className="flex justify-end gap-3 text-slate-800">
                    <span className="text-slate-500 font-sans">Invoice No.</span>
                    <span className="font-bold">[inv_no]</span>
                  </div>
                  <div className="flex justify-end gap-3 text-slate-800">
                    <span className="text-slate-500 font-sans">Invoice Date</span>
                    <span>[inv_date]</span>
                  </div>
                  <div className="flex justify-end gap-3 text-slate-800">
                    <span className="text-slate-500 font-sans">Due Date</span>
                    <span>[due_date]</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Line Items Table */}
              <div className="border border-slate-200 rounded overflow-hidden pt-2">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-mono text-slate-600 text-[10px]">
                      <th className="p-2">[item_desc]</th>
                      <th className="p-2">[item_price]</th>
                      <th className="p-2">[item_qty]</th>
                      <th className="p-2">[item_net_amt]</th>
                      <th className="p-2">[item_vat_name]</th>
                      <th className="p-2">[item_tax_amt]</th>
                      <th className="p-2 text-right">[item_tot_amt]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    <tr>
                      <td className="p-2 font-medium text-slate-800">Professional Accountancy &amp; Advisory Services</td>
                      <td className="p-2 font-mono">£350.00</td>
                      <td className="p-2 font-mono">1</td>
                      <td className="p-2 font-mono">£350.00</td>
                      <td className="p-2">Standard 20%</td>
                      <td className="p-2 font-mono">£70.00</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">£420.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Row 5: Totals Summary */}
              <div className="flex justify-end pt-1">
                <div className="w-60 space-y-1 font-mono text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Net Amount:</span>
                    <span>[invoice_net_amt]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">VAT Amount:</span>
                    <span>[inv_tax_amt]</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span className="font-sans">Total Amount:</span>
                    <span style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>[inv_tot_amt]</span>
                  </div>
                </div>
              </div>

              {/* Row 6: Bank Details */}
              <div className="pt-3 border-t border-slate-200 space-y-1 text-[11px]">
                <div className="font-bold text-slate-900">Bank Details</div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono text-[10px]">
                  <div>Bank Name: <span className="font-sans font-medium">{pdfForm.bankName || "[bank_name]"}</span></div>
                  <div>Account No. <span className="font-bold">[account_no]</span></div>
                  <div>Sort/Branch Code <span className="font-bold">[sort_code]</span></div>
                  <div>Reference: <span className="font-sans">[inv_no]</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER CKEDITOR 3 TOOLBAR (Exact Secondary Toolbar)                      */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-b from-[#f7f7f7] via-[#efefef] to-[#dfdfdf] border-t border-b border-[#cfcfcf] px-2 py-1.5 flex flex-wrap items-center gap-1 text-xs select-none shadow-2xs">
          {/* B, I, U Group */}
          <div className="flex items-center bg-white/70 border border-[#c4c4c4] rounded-xs shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand("bold", undefined, true)}
              className="px-2 py-1 hover:bg-[#e6e6e6] text-slate-800 font-bold border-r border-[#dedede] text-xs"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic", undefined, true)}
              className="px-2 py-1 hover:bg-[#e6e6e6] text-slate-800 italic font-serif border-r border-[#dedede] text-xs"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline", undefined, true)}
              className="px-2 py-1 hover:bg-[#e6e6e6] text-slate-800 underline text-xs"
              title="Underline"
            >
              U
            </button>
          </div>

          {/* Link / Unlink Group */}
          <div className="flex items-center bg-white/70 border border-[#c4c4c4] rounded-xs shadow-2xs">
            <button
              type="button"
              onClick={() => insertLink(true)}
              className="p-1 hover:bg-[#e6e6e6] text-slate-700 border-r border-[#dedede]"
              title="Insert Link"
            >
              <LinkIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("unlink", undefined, true)}
              className="p-1 hover:bg-[#e6e6e6] text-slate-700"
              title="Unlink"
            >
              <Unlink size={13} />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-[#c4c4c4] mx-0.5" />

          {/* Styles Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("formatBlock", e.target.value, true);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="">Styles -</option>
            <option value="p">Normal</option>
            <option value="h3">Heading 3</option>
          </select>

          {/* Normal Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("formatBlock", e.target.value, true);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="div">Normal -</option>
            <option value="p">Paragraph</option>
            <option value="address">Address</option>
          </select>

          {/* Font Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("fontName", e.target.value, true);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="">Font -</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>

          {/* Size Dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) executeCommand("fontSize", e.target.value, true);
            }}
            className="border border-[#c4c4c4] rounded-xs px-2 py-1 bg-white text-[11px] text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="">Size -</option>
            <option value="1">8 pt</option>
            <option value="2">10 pt</option>
            <option value="3">12 pt</option>
          </select>

          <div className="h-5 w-[1px] bg-[#c4c4c4] mx-0.5" />

          {/* Text Color for Footer */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFooterColorPicker(showFooterColorPicker === "text" ? null : "text")}
              className="flex items-center gap-0.5 border border-[#c4c4c4] bg-white px-2 py-1 rounded-xs hover:bg-slate-50 text-[11px] font-bold text-slate-800 shadow-2xs"
            >
              <span className="underline decoration-purple-600 font-serif">A</span>
              <ChevronDown size={10} className="text-slate-500" />
            </button>

            {showFooterColorPicker === "text" && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-300 p-2 rounded shadow-lg grid grid-cols-6 gap-1 w-36 animate-in fade-in">
                {standardColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => executeCommand("foreColor", c, true)}
                    className="w-4 h-4 rounded-2xs border border-slate-300 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Background Color for Footer */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFooterColorPicker(showFooterColorPicker === "bg" ? null : "bg")}
              className="flex items-center gap-0.5 border border-[#c4c4c4] bg-white px-2 py-1 rounded-xs hover:bg-slate-50 text-[11px] font-bold text-slate-800 shadow-2xs"
            >
              <span className="bg-yellow-200 px-0.5 rounded-2xs font-serif">A</span>
              <ChevronDown size={10} className="text-slate-500" />
            </button>

            {showFooterColorPicker === "bg" && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-300 p-2 rounded shadow-lg grid grid-cols-6 gap-1 w-36 animate-in fade-in">
                {standardColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => executeCommand("hiliteColor", c, true)}
                    className="w-4 h-4 rounded-2xs border border-slate-300 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER CANVAS AREA                                                       */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white min-h-[90px] text-xs">
          <div
            ref={footerEditorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onBlur={(e) => {
              setPdfForm({ ...pdfForm, footerText: e.currentTarget.innerText });
            }}
            className="w-full text-slate-700 min-h-[60px] focus:outline-hidden p-2 border border-transparent hover:border-slate-200 rounded leading-relaxed font-sans"
          >
            {pdfForm.footerText || "Please pay within 30 days of invoice date. Thank you for your business."}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ACTION BUTTONS (Preview, Save, Download)                           */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onPreview}
          className="px-6 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
        >
          <Eye size={14} />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
        >
          <Save size={14} />
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="px-6 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
