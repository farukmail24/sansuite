import { jsPDF } from "jspdf";

export interface InvoiceItem {
  description: string;
  unitPrice: number | string;
  quantity: number | string;
  netAmount: number | string;
  vatRate?: string;
  vatAmount?: number | string;
  grossAmount?: number | string;
}

export interface InvoicePdfData {
  documentType?: "Invoice" | "Quotation" | "Credit Note";
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  reference?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyRegNo?: string;
  companyVatRegNo?: string;
  customerName: string;
  customerAddress?: string;
  items: InvoiceItem[];
  netAmount: number | string;
  vatAmount: number | string;
  totalAmount: number | string;
  dueAmount?: number | string;
  bankName?: string;
  accountNo?: string;
  branchCode?: string;
  currencySymbol?: string;
  logoUrl?: string;
}

function loadLogoImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateSanSuiteInvoicePdf(data: InvoicePdfData, action: "download" | "preview" = "download"): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = data.currencySymbol || "£";
  const isQuote = data.documentType === "Quotation";
  const isCreditNote = data.documentType === "Credit Note";

  const docTitle = isQuote ? "QUOTATION" : (isCreditNote ? "CREDIT NOTE" : "INVOICE");
  const numberLabel = isQuote ? "Quotation No." : (isCreditNote ? "Credit Note No." : "Invoice No.");
  const dateLabel = isQuote ? "Quotation Date" : (isCreditNote ? "Credit Note Date" : "Invoice Date");
  const dueLabel = isQuote ? "Valid Until" : (isCreditNote ? "Reference Date" : "Due Date");

  // Primary Theme Color:
  // Quotation: Sleek royal purple/indigo (#4f46e5)
  // Invoice: SanSuite primary blue (#0284c7)
  // Credit Note: Muted Slate / Crimson (#dc2626)
  const primaryR = isQuote ? 79 : (isCreditNote ? 220 : 2);
  const primaryG = isQuote ? 70 : (isCreditNote ? 38 : 132);
  const primaryB = isQuote ? 229 : (isCreditNote ? 38 : 199);

  // --- 1. TOP HEADER ---
  // Left: Logo (Authentic Company Logo or Standard SanSuite Stationery Branding)
  let logoImg: HTMLImageElement | null = null;
  if (data.logoUrl) {
    try {
      logoImg = await loadLogoImage(data.logoUrl);
    } catch {
      logoImg = null;
    }
  }

  if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
    const maxW = 55;
    const maxH = 24;
    const aspect = logoImg.width / logoImg.height;
    let renderW = maxW;
    let renderH = maxW / aspect;
    if (renderH > maxH) {
      renderH = maxH;
      renderW = maxH * aspect;
    }
    const renderX = 20;
    const renderY = 20 + (maxH - renderH) / 2;
    try {
      doc.addImage(logoImg, "PNG", renderX, renderY, renderW, renderH);
    } catch {
      doc.setFillColor(primaryR, primaryG, primaryB);
      doc.roundedRect(20, 20, 48, 22, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(data.companyName ? data.companyName.slice(0, 15) : "Your Logo Here", 44, 33, { align: "center" });
    }
  } else {
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.roundedRect(20, 20, 48, 22, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(data.companyName ? data.companyName.slice(0, 15) : "Your Logo Here", 44, 33, { align: "center" });
  }

  // Right: Company Details (Authentic Client Business Records)
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text((data.companyName || "Company").toUpperCase(), pageWidth - 20, 24, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  let rightY = 29;
  if (data.companyAddress) {
    const addressLines = doc.splitTextToSize(data.companyAddress, 75);
    doc.text(addressLines, pageWidth - 20, rightY, { align: "right" });
    rightY += addressLines.length * 3.8;
  }

  if (data.companyPhone) {
    doc.text(`Tel: ${data.companyPhone}`, pageWidth - 20, rightY, { align: "right" });
    rightY += 3.8;
  }

  rightY += 1.5;

  if (data.companyRegNo) {
    doc.text(`CRN: ${data.companyRegNo}`, pageWidth - 20, rightY, { align: "right" });
    rightY += 3.8;
  }

  if (data.companyVatRegNo) {
    doc.text(`VAT Reg. No: ${data.companyVatRegNo}`, pageWidth - 20, rightY, { align: "right" });
    rightY += 3.8;
  }

  // Horizontal divider line
  const dividerY = Math.max(50, rightY + 4);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.6);
  doc.line(20, dividerY, pageWidth - 20, dividerY);

  // --- 2. DOCUMENT META & CUSTOMER DETAILS ---
  let metaY = dividerY + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text(docTitle, 20, metaY);

  metaY += 7;

  // Left Meta Info Table
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700

  doc.text(numberLabel, 20, metaY);
  doc.text(":", 48, metaY);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.invoiceNumber || (isQuote ? "QT-1" : "INV-1")), 52, metaY);
  doc.setFont("helvetica", "normal");

  doc.text(dateLabel, 20, metaY + 5);
  doc.text(":", 48, metaY + 5);
  doc.text(String(data.invoiceDate || "-"), 52, metaY + 5);

  doc.text(dueLabel, 20, metaY + 10);
  doc.text(":", 48, metaY + 10);
  doc.text(String(data.dueDate || "-"), 52, metaY + 10);

  // Right Customer Details Block
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(isQuote ? "QUOTATION FOR:" : (isCreditNote ? "CREDIT TO:" : "INVOICE TO:"), pageWidth - 20, metaY - 3, { align: "right" });

  doc.setFontSize(9.5);
  doc.text(String(data.customerName || "Customer"), pageWidth - 20, metaY + 2, { align: "right" });

  if (data.customerAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const custAddrLines = doc.splitTextToSize(data.customerAddress, 65);
    doc.text(custAddrLines, pageWidth - 20, metaY + 6.5, { align: "right" });
  }

  // --- 3. ITEMS TABLE ---
  let tableY = metaY + 20;

  // Header background
  if (isQuote) {
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254); // indigo-200
  } else if (isCreditNote) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
  } else {
    doc.setFillColor(224, 242, 254); // sky-100
    doc.setDrawColor(186, 230, 253); // sky-200
  }
  doc.rect(20, tableY, pageWidth - 40, 7.5, "F");

  // Header border
  doc.setLineWidth(0.4);
  doc.rect(20, tableY, pageWidth - 40, 7.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(primaryR, primaryG, primaryB);

  doc.text("Description", 23, tableY + 5);
  doc.text("Unit Price", 98, tableY + 5, { align: "right" });
  doc.text("Qty", 114, tableY + 5, { align: "right" });
  doc.text("Net Amount", 132, tableY + 5, { align: "right" });
  doc.text("VAT Rate", 147, tableY + 5, { align: "right" });
  doc.text("VAT Amount", 164, tableY + 5, { align: "right" });
  doc.text("Total Amount", pageWidth - 23, tableY + 5, { align: "right" });

  let rowY = tableY + 7.5;
  const items = data.items && data.items.length > 0
    ? data.items
    : [{
        description: isQuote ? "Quotation Items" : "Services Rendered",
        unitPrice: data.netAmount,
        quantity: 1,
        netAmount: data.netAmount,
        vatRate: Number(data.vatAmount || 0) > 0 ? "20%" : "No VAT",
        vatAmount: data.vatAmount,
        grossAmount: data.totalAmount
      }];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const desc = String(item.description || (isQuote ? "Quotation Item" : "Services Rendered"));
    const descLines = doc.splitTextToSize(desc, 60);
    const rowHeight = Math.max(7.5, descLines.length * 4.2 + 2);

    // Subtle alternating row fill
    if (i % 2 === 0) {
      if (isQuote) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(235, 248, 255);
      }
      doc.rect(20, rowY, pageWidth - 40, rowHeight, "F");
    }

    // Row bottom line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(20, rowY + rowHeight, pageWidth - 20, rowY + rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(primaryR, primaryG, primaryB);
    doc.text(descLines, 23, rowY + 4.8);

    doc.setTextColor(51, 65, 85); // slate-700 numbers
    doc.text(Number(item.unitPrice || 0).toFixed(2), 98, rowY + 4.8, { align: "right" });
    doc.text(Number(item.quantity || 1).toFixed(2), 114, rowY + 4.8, { align: "right" });
    doc.text(Number(item.netAmount || 0).toFixed(2), 132, rowY + 4.8, { align: "right" });
    doc.text(String(item.vatRate || "No VAT"), 147, rowY + 4.8, { align: "right" });
    doc.text(Number(item.vatAmount || 0).toFixed(2), 164, rowY + 4.8, { align: "right" });
    const computedGross = Number(item.grossAmount || (Number(item.netAmount || 0) + Number(item.vatAmount || 0)));
    doc.text(computedGross.toFixed(2), pageWidth - 23, rowY + 4.8, { align: "right" });

    rowY += rowHeight;
  }

  // --- 4. TOTALS & DETAILS SECTION ---
  const summaryY = rowY + 8;

  // Left Section
  let leftSummaryY = summaryY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  if (data.reference) {
    doc.text("Reference / Terms:", 20, leftSummaryY);
    doc.text(data.reference, 52, leftSummaryY);
    leftSummaryY += 7;
  }

  if (isQuote) {
    // --- QUOTATION SPECIFIC ACCEPTANCE TERMS (NO BANK DETAILS) ---
    leftSummaryY += 3;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, leftSummaryY, 95, 26, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(20, leftSummaryY, 95, 26, 1.5, 1.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Quotation Acceptance Terms", 24, leftSummaryY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("This quotation remains valid until the date specified above.", 24, leftSummaryY + 10.5);
    doc.text("To accept this quotation, please sign below or confirm via email.", 24, leftSummaryY + 15);

    doc.setDrawColor(148, 163, 184);
    doc.line(24, leftSummaryY + 22, 70, leftSummaryY + 22);
    doc.text("Authorized Signature", 24, leftSummaryY + 25);

    doc.line(75, leftSummaryY + 22, 108, leftSummaryY + 22);
    doc.text("Date", 75, leftSummaryY + 25);
  } else if (!isCreditNote) {
    // --- INVOICE SPECIFIC BANK PAYMENT DETAILS ---
    leftSummaryY += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Bank Payment Details", 20, leftSummaryY);

    leftSummaryY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    doc.text("Bank Name", 20, leftSummaryY);
    doc.text(":", 48, leftSummaryY);
    doc.text(data.bankName || "N/A", 52, leftSummaryY);

    doc.text("Account No.", 20, leftSummaryY + 5);
    doc.text(":", 48, leftSummaryY + 5);
    doc.text(data.accountNo || "N/A", 52, leftSummaryY + 5);

    doc.text("Sort / Branch Code", 20, leftSummaryY + 10);
    doc.text(":", 48, leftSummaryY + 10);
    doc.text(data.branchCode || "N/A", 52, leftSummaryY + 10);
  }

  // Right Section: Totals Summary
  let rightSummaryY = summaryY;
  const colLabelX = 135;
  const colColonX = 158;
  const colValueX = pageWidth - 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text(isQuote ? "Net Quotation" : "Net Amount", colLabelX, rightSummaryY);
  doc.text(":", colColonX, rightSummaryY);
  doc.setFont("helvetica", "bold");
  doc.text(`${currency}${Number(data.netAmount || 0).toFixed(2)}`, colValueX, rightSummaryY, { align: "right" });
  doc.setFont("helvetica", "normal");

  rightSummaryY += 5.5;
  doc.text("VAT Total", colLabelX, rightSummaryY);
  doc.text(":", colColonX, rightSummaryY);
  doc.setFont("helvetica", "bold");
  doc.text(`${currency}${Number(data.vatAmount || 0).toFixed(2)}`, colValueX, rightSummaryY, { align: "right" });
  doc.setFont("helvetica", "normal");

  rightSummaryY += 5.5;
  doc.text(isQuote ? "Quotation Total" : (isCreditNote ? "Credit Total" : "Total Amount"), colLabelX, rightSummaryY);
  doc.text(":", colColonX, rightSummaryY);
  doc.setFont("helvetica", "bold");
  doc.text(`${currency}${Number(data.totalAmount || 0).toFixed(2)}`, colValueX, rightSummaryY, { align: "right" });
  doc.setFont("helvetica", "normal");

  if (!isQuote && !isCreditNote) {
    rightSummaryY += 5.5;
    doc.text("Due Amount", colLabelX, rightSummaryY);
    doc.text(":", colColonX, rightSummaryY);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency}${Number(data.dueAmount ?? data.totalAmount ?? 0).toFixed(2)}`, colValueX, rightSummaryY, { align: "right" });
  }

  // Output filename
  const cleanCompanyName = (data.companyName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePrefix = isQuote ? "Quotation" : (isCreditNote ? "CreditNote" : "Invoice");
  const fileName = `${filePrefix}_${cleanCompanyName}_${data.invoiceNumber || Date.now()}.pdf`;

  if (action === "preview") {
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  } else {
    doc.save(fileName);
  }
}
