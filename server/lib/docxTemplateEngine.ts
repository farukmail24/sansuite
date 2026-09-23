import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { pool } from "../db";

export interface DocxLineItem {
  description: string;
  unitPrice: number | string;
  quantity: number | string;
  netAmount: number | string;
  vatRate?: string;
  vatAmount?: number | string;
  grossAmount?: number | string;
}

export interface DocxMergeData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyRegNo?: string;
  companyVatRegNo?: string;

  // Header & Document meta
  docTitle?: string;
  docNumber: string;
  docDate: string;
  expiryDate?: string;
  dueDate?: string;
  reference?: string;

  // Customer
  customerName: string;
  customerAddress?: string;

  // Line items
  items: DocxLineItem[];

  // Totals
  netAmount: number | string;
  vatAmount: number | string;
  totalAmount: number | string;
  dueAmount?: number | string;
  discount?: number | string;

  // Bank details (for Invoices)
  bankName?: string;
  accountNo?: string;
  branchCode?: string;
}

export interface MergeDocxOptions {
  templateType: "invoice" | "quotation" | "credit_note" | "dividend";
  practiceId: number;
  clientId?: number | null;
  data: DocxMergeData;
}

/**
 * Escapes XML special characters for safe inclusion in Word OpenXML
 */
function escapeXml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a value with line breaks converted into Word XML breaks (<w:br/>)
 */
function formatXmlValue(val: any): string {
  if (val === null || val === undefined) return "";
  const lines = String(val).split(/\r?\n/);
  return lines.map((l) => escapeXml(l)).join("</w:t><w:br/><w:t>");
}

/**
 * Replaces MERGEFIELD blocks and text tokens in Word XML
 */
export function replaceMergeFieldsInXml(xml: string, values: Record<string, any>): string {
  let result = xml;

  for (const [key, rawVal] of Object.entries(values)) {
    const formattedVal = formatXmlValue(rawVal);
    const escapedKey = key.replace(/\./g, "\\.");

    // 1. Full MERGEFIELD instruction block:
    // Matches from the <w:r> containing begin fldChar through to the <w:r> containing end fldChar without crossing other begin/end
    const fieldRegex = new RegExp(
      `<w:r\\b[^>]*>(?:(?!<\\/w:r>)[\\s\\S])*?<w:fldChar\\s+w:fldCharType="begin"[^>]*>(?:(?!<w:fldChar\\s+w:fldCharType="(?:begin|end)")[\\s\\S])*?<w:instrText[^>]*>\\s*MERGEFIELD\\s+${escapedKey}\\b(?:(?!<w:fldChar\\s+w:fldCharType="(?:begin|end)")[\\s\\S])*?<w:fldChar\\s+w:fldCharType="end"[^>]*>(?:(?!<\\/w:r>)[\\s\\S])*?<\\/w:r>`,
      "gi"
    );
    result = result.replace(fieldRegex, `<w:r><w:t xml:space="preserve">${formattedVal}</w:t></w:r>`);

    // 2. Standalone guillemets (e.g. «CustomerName» or « CustomerName »)
    const guillemetRegex = new RegExp(`«\\s*${escapedKey}\\s*»`, "gi");
    result = result.replace(guillemetRegex, formattedVal);

    // 3. Bracket tokens (e.g. [CustomerName])
    const bracketRegex = new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, "gi");
    result = result.replace(bracketRegex, formattedVal);
  }

  return result;
}

/**
 * Duplicates and populates table rows for line items
 */
export function mergeTableRowsInXml(xml: string, items: DocxLineItem[]): string {
  // Find table row <w:tr> that contains "Item.Description"
  const rowRegex = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  let match: RegExpExecArray | null;
  let templateRow: string | null = null;
  let rowStartIndex = -1;
  let rowLength = -1;

  while ((match = rowRegex.exec(xml)) !== null) {
    if (match[0].includes("Item.Description") || match[0].includes("Item.Price") || match[0].includes("Item.Qty")) {
      templateRow = match[0];
      rowStartIndex = match.index;
      rowLength = match[0].length;
      break;
    }
  }

  if (!templateRow || rowStartIndex === -1) {
    // If no specific item row is found, return original XML
    return xml;
  }

  const generatedRows: string[] = [];
  const safeItems = items && items.length > 0
    ? items
    : [{
        description: "Services Rendered",
        unitPrice: "0.00",
        quantity: "1",
        netAmount: "0.00",
        vatRate: "No VAT",
        vatAmount: "0.00",
        grossAmount: "0.00",
      }];

  for (const it of safeItems) {
    const itemValues: Record<string, any> = {
      "Item.Description": it.description || "",
      "Item.Price": typeof it.unitPrice === "number" ? it.unitPrice.toFixed(2) : it.unitPrice,
      "Item.Qty": typeof it.quantity === "number" ? it.quantity.toString() : it.quantity,
      "Item.NetAmount": typeof it.netAmount === "number" ? it.netAmount.toFixed(2) : it.netAmount,
      "Item.VatName": it.vatRate || "No VAT",
      "Item.VatRate": it.vatRate || "No VAT",
      "Item.VatAmount": typeof it.vatAmount === "number" ? it.vatAmount.toFixed(2) : it.vatAmount,
      "Item.TotalAmount": typeof it.grossAmount === "number" ? it.grossAmount.toFixed(2) : (it.grossAmount || it.netAmount),
      "Item.GrossAmount": typeof it.grossAmount === "number" ? it.grossAmount.toFixed(2) : (it.grossAmount || it.netAmount),
    };

    const rowMerged = replaceMergeFieldsInXml(templateRow, itemValues);
    generatedRows.push(rowMerged);
  }

  const allRowsXml = generatedRows.join("");
  return xml.substring(0, rowStartIndex) + allRowsXml + xml.substring(rowStartIndex + rowLength);
}

/**
 * Resolves the active template path from the database configuration or default master templates
 */
async function resolveTemplateFilePath(
  templateType: "invoice" | "quotation" | "credit_note" | "dividend",
  practiceId: number,
  clientId?: number | null
): Promise<string> {
  const masterDir = fs.existsSync(path.resolve(process.cwd(), "server", "templates", "sansuite-docs"))
    ? path.resolve(process.cwd(), "server", "templates", "sansuite-docs")
    : path.resolve(process.cwd(), "server", "templates", "capium-docs");

  const defaultFileNameMap = {
    invoice: "Invoice.docx",
    quotation: "Quotation.docx",
    credit_note: "CreditNote.docx",
    dividend: "Dividend.docx",
  };

  const fileName = defaultFileNameMap[templateType] || "Invoice.docx";
  const defaultMasterPath = path.join(masterDir, fileName);

  try {
    // Check database for active template
    let query = `
      SELECT * FROM bookkeeping_invoice_templates 
      WHERE practice_id = ? 
    `;
    const params: any[] = [practiceId];

    if (clientId) {
      query += ` AND (client_id = ? OR client_id IS NULL) `;
      query += ` ORDER BY CASE WHEN client_id = ? THEN 1 ELSE 2 END, is_default DESC, id DESC LIMIT 1`;
      params.push(clientId, clientId);
    } else {
      query += ` ORDER BY is_default DESC, id DESC LIMIT 1`;
    }

    const [rows]: any = await pool.query(query, params);
    if (rows && rows.length > 0) {
      const tpl = rows[0];
      if (tpl.custom_dir) {
        const customCandidate = path.join(tpl.custom_dir, fileName);
        if (fs.existsSync(customCandidate)) {
          return customCandidate;
        }

        // Check if bundle.zip exists and unpack it
        const bundleZip = path.join(tpl.custom_dir, "bundle.zip");
        if (fs.existsSync(bundleZip)) {
          try {
            const zipData = fs.readFileSync(bundleZip);
            const zip = await JSZip.loadAsync(zipData);
            for (const [name, entry] of Object.entries(zip.files)) {
              if (!entry.dir && name.endsWith(".docx")) {
                const buf = await entry.async("nodebuffer");
                fs.writeFileSync(path.join(tpl.custom_dir, path.basename(name)), buf);
              }
            }
            if (fs.existsSync(customCandidate)) {
              return customCandidate;
            }
          } catch (unzipErr) {
            console.warn("Could not unpack bundle.zip:", unzipErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not query bookkeeping_invoice_templates for custom template, falling back to master:", err);
  }

  return defaultMasterPath;
}

/**
 * Core engine to merge dynamic database data into Word (.docx) templates
 */
export async function generateMergedDocx(options: MergeDocxOptions): Promise<Buffer> {
  const { templateType, practiceId, clientId, data } = options;

  // 1. Resolve template file path
  const templatePath = await resolveTemplateFilePath(templateType, practiceId, clientId);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Word template file not found at path: ${templatePath}`);
  }

  // 2. Load zip archive
  const fileBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  // Common Header Values (for Company Info)
  const headerValues: Record<string, any> = {
    CompanyName: data.companyName || "",
    CompanyAddress: data.companyAddress || "",
    CompanyPhone: data.companyPhone ? `Tel: ${data.companyPhone}` : "",
    CompanyRegNo: data.companyRegNo ? `CRN: ${data.companyRegNo}` : "",
    CompanyVatRegNo: data.companyVatRegNo ? `VAT Reg. No: ${data.companyVatRegNo}` : "",
  };

  // Format currency values
  const fmt = (val: any) => (typeof val === "number" ? `£${val.toFixed(2)}` : (val ? `£${parseFloat(val).toFixed(2)}` : "£0.00"));

  // Build document-specific values dictionary
  let docValues: Record<string, any> = {
    ...headerValues,
    CustomerName: data.customerName || "",
    CustomerAddress: data.customerAddress || "",
    InvoiceReference: data.reference || "",
  };

  if (templateType === "quotation") {
    docValues = {
      ...docValues,
      QuotationNo: data.docNumber,
      QuotationDate: data.docDate,
      QuotationNetAmount: fmt(data.netAmount),
      QuotationVatAmount: fmt(data.vatAmount),
      QuotationTotAmount: fmt(data.totalAmount),
    };
  } else if (templateType === "invoice") {
    docValues = {
      ...docValues,
      InvoiceTitle: data.docTitle || "INVOICE",
      InvoiceNo: data.docNumber,
      InvoiceDate: data.docDate,
      InvoiceDueDate: data.dueDate || "-",
      TotalDiscount: data.discount ? fmt(data.discount) : "£0.00",
      InvoiceNetAmount: fmt(data.netAmount),
      InvoiceVatAmount: fmt(data.vatAmount),
      InvoiceTotalAmount: fmt(data.totalAmount),
      InvoiceDueAmount: fmt(data.dueAmount ?? data.totalAmount),
      BankName: data.bankName || "",
      AccountNo: data.accountNo || "",
      BranchCode: data.branchCode || "",
    };
  } else if (templateType === "credit_note") {
    docValues = {
      ...docValues,
      InvoiceTitle: "CREDIT NOTE",
      InvoiceNo: data.docNumber,
      InvoiceDate: data.docDate,
      InvoiceDueDate: data.dueDate || "-",
      InvoiceNetAmount: fmt(data.netAmount),
      InvoiceVatAmount: fmt(data.vatAmount),
      InvoiceTotalAmount: fmt(data.totalAmount),
      InvoiceDueAmount: "£0.00",
      CreditNoteTitle: "CREDIT NOTE DETAILS",
    };
  } else if (templateType === "dividend") {
    docValues = {
      ...docValues,
      RefNo: data.docNumber,
      DeclarationDate: data.docDate,
      PaymentDate: data.dueDate || data.docDate,
      DividendPayable: fmt(data.totalAmount),
    };
  }

  // 3. Update Headers and Footers
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.startsWith("word/header") || filename.startsWith("word/footer")) {
      let xml = await file.async("text");
      xml = replaceMergeFieldsInXml(xml, headerValues);
      zip.file(filename, xml);
    }
  }

  // 4. Update Main Document
  const docEntry = zip.file("word/document.xml");
  if (docEntry) {
    let docXml = await docEntry.async("text");

    // First merge table rows (Item.Description, etc.)
    docXml = mergeTableRowsInXml(docXml, data.items);

    // Then replace all document-level fields
    docXml = replaceMergeFieldsInXml(docXml, docValues);

    // Clean up any remaining receipt or credit note dummy sections if they are empty
    // e.g. ReceiptTitle, CreditNoteTitle
    const cleanups = {
      ReceiptTitle: "",
      "Receipt.No": "",
      "Receipt.Date": "",
      "Receipt.Account": "",
      "Receipt.Amount": "",
      CreditNoteTitle: "",
      "CreditNote.No": "",
      "CreditNote.Date": "",
      "CreditNote.Reference": "",
      "CreditNote.Amount": "",
    };
    docXml = replaceMergeFieldsInXml(docXml, cleanups);

    zip.file("word/document.xml", docXml);
  }

  // 5. Generate and return final .docx binary buffer
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}
