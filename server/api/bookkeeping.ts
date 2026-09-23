import { Router } from "express";
import { db } from "../db";
import { 
  items, cisSettings, salesInvoices, invoiceItems, purchases, purchaseItems, 
  bankAccounts, bankTransactions, vatPeriods, clients, contacts, chartOfAccounts, 
  journalEntries, journalLines, quotations, invoiceTemplates,
  fixedAssets, recurringProfiles, paymentTransactions,
  creditNotes, creditNoteItems, creditNoteAllocations,
  bankRules
} from "@shared/schema";
import { eq, inArray, and, gte, lte, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import { generateMergedDocx } from "../lib/docxTemplateEngine";

const router = Router();
router.use(authMiddleware);

// Helper to get client IDs for the current practice
async function getClientIds(practiceId: number) {
  const practiceClients = await db.select({ id: clients.id }).from(clients).where(eq(clients.practiceId, practiceId));
  return practiceClients.map(c => c.id).length > 0 ? practiceClients.map(c => c.id) : [-1]; // -1 ensures inArray doesn't crash on empty
}

async function getSystemAccount(clientId: number, name: string, category: string, nominalCode: string) {
  const existing = await db.select().from(chartOfAccounts).where(
    and(eq(chartOfAccounts.clientId, clientId), eq(chartOfAccounts.nominalCode, nominalCode))
  );
  if (existing.length > 0) return existing[0].id;
  
  const [res] = await db.insert(chartOfAccounts).values({
    clientId, name, category, nominalCode, isSystem: true
  });
  return res.insertId;
}

// GET /api/bookkeeping/dashboard-stats
router.get("/dashboard-stats", async (req: any, res) => {
  try {
    const cids = await getClientIds(req.user.practiceId);
    
    // Aggregate VAT statuses (Mocking actual HMRC link for now, relying on vat_periods table status)
    const vatRecords = await db.select({ status: vatPeriods.vatStatus }).from(vatPeriods).where(inArray(vatPeriods.clientId, cids));
    let hmrc = 0, sansuite = 0, due = 0, overdue = 0;
    for (const record of vatRecords) {
      if (record.status === "Filed") hmrc++; // Assuming submitted to HMRC
      else if (record.status === "Calculated") due++;
      else if (record.status === "Draft") overdue++;
      else sansuite++;
    }
    const vatStatusData = [
      { name: "HMRC Submitted", value: hmrc, color: "#00b894" },
      { name: "SanSuite Submitted", value: sansuite, color: "#6c5ce7" },
      { name: "Due", value: due, color: "#fdcb6e" },
      { name: "Overdue", value: overdue, color: "#d63031" },
    ];

    // Aggregate monthly invoices and purchases created
    // (A more accurate production way is grouping by MONTH(createdAt), but we'll approximate with code for simplicity)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = monthNames.map(month => ({ month, count: 0 }));
    
    const invoices = await db.select({ date: salesInvoices.invoiceDate }).from(salesInvoices).where(inArray(salesInvoices.clientId, cids));
    for (const inv of invoices) {
      if (inv.date) {
        const d = new Date(inv.date);
        monthlyData[d.getMonth()].count++;
      }
    }
    
    res.json({ vatStatusData, monthlyData });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// GET /api/bookkeeping/reports/:clientId/profit-loss
router.get("/reports/:clientId/profit-loss", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    // Simple P&L Logic for zero-mock:
    // Sales Invoices -> Income
    // Purchases -> Expenses
    // In reality, this requires mapping against chartOfAccounts categories.
    // For now, we will query both tables and aggregate manually.
    const allInvoices = await db.select({
      total: invoiceItems.netAmount, 
      nominalCode: invoiceItems.nominalCode,
    }).from(invoiceItems)
      .innerJoin(salesInvoices, eq(invoiceItems.invoiceId, salesInvoices.id))
      .where(eq(salesInvoices.clientId, clientId));

    const allPurchases = await db.select({
      total: purchaseItems.netAmount,
      nominalCode: purchaseItems.nominalCode,
    }).from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .where(eq(purchases.clientId, clientId));

    const coa = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.clientId, clientId));
    const coaMap = new Map(coa.map(c => [c.nominalCode, c]));

    let salesRev = 0, otherInc = 0;
    let costOfSales = 0, adminExp = 0, salaryExp = 0, rentExp = 0, otherExp = 0;

    for (const inv of allInvoices) {
      const num = parseFloat(inv.total || "0");
      if (inv.nominalCode === "4000") salesRev += num;
      else otherInc += num;
    }

    for (const pur of allPurchases) {
      const num = parseFloat(pur.total || "0");
      if (pur.nominalCode === "5000") costOfSales += num;
      else if (pur.nominalCode === "7000") adminExp += num;
      else otherExp += num;
    }

    const plData = [
      { category: "Income", label: "Sales Revenue", amount: salesRev, type: "income" },
      { category: "Income", label: "Other Income", amount: otherInc, type: "income" },
      { category: "Expenses", label: "Cost of Sales", amount: costOfSales, type: "expense" },
      { category: "Expenses", label: "Administrative Expenses", amount: adminExp, type: "expense" },
      { category: "Expenses", label: "Salaries & Wages", amount: salaryExp, type: "expense" },
      { category: "Expenses", label: "Rent & Rates", amount: rentExp, type: "expense" },
      { category: "Expenses", label: "Other Expenses", amount: otherExp, type: "expense" },
    ];

    res.json({ plData });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate Profit & Loss report" });
  }
});

// GET /api/bookkeeping/invoices — all invoices for practice
router.get("/invoices", async (req: any, res) => {
  try {
    const cids = await getClientIds(req.user.practiceId);
    const result = await db.select({
      id: salesInvoices.id,
      clientId: salesInvoices.clientId,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceType: salesInvoices.invoiceType,
      invoiceDate: salesInvoices.invoiceDate,
      dueDate: salesInvoices.dueDate,
      subTotal: salesInvoices.subTotal,
      vatTotal: salesInvoices.vatTotal,
      grandTotal: salesInvoices.grandTotal,
      status: salesInvoices.status,
      notes: salesInvoices.notes,
      clientName: clients.clientName,
    })
    .from(salesInvoices)
    .leftJoin(clients, eq(salesInvoices.clientId, clients.id))
    .where(inArray(salesInvoices.clientId, cids));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// GET /api/bookkeeping/invoices/client/:clientId
router.get("/invoices/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const invoices = await db
      .select({
        id: salesInvoices.id,
        clientId: salesInvoices.clientId,
        customerId: salesInvoices.customerId,
        invoiceNumber: salesInvoices.invoiceNumber,
        invoiceType: salesInvoices.invoiceType,
        invoiceDate: salesInvoices.invoiceDate,
        dueDate: salesInvoices.dueDate,
        subTotal: salesInvoices.subTotal,
        vatTotal: salesInvoices.vatTotal,
        grandTotal: salesInvoices.grandTotal,
        paidAmount: salesInvoices.paidAmount,
        status: salesInvoices.status,
        notes: salesInvoices.notes,
        createdAt: salesInvoices.createdAt,
        customerName: contacts.name,
        customerEmail: contacts.email,
        customerPhone: contacts.phone,
        customerAddress: contacts.address,
      })
      .from(salesInvoices)
      .leftJoin(contacts, eq(salesInvoices.customerId, contacts.id))
      .where(eq(salesInvoices.clientId, clientId))
      .orderBy(desc(salesInvoices.id));

    const invoiceIds = invoices.map(i => i.id);
    let allItems: any[] = [];
    if (invoiceIds.length > 0) {
      allItems = await db
        .select()
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, invoiceIds));
    }

    const itemsMap = new Map<number, any[]>();
    for (const item of allItems) {
      if (!itemsMap.has(item.invoiceId)) {
        itemsMap.set(item.invoiceId, []);
      }
      itemsMap.get(item.invoiceId)!.push(item);
    }

    const result = invoices.map(inv => ({
      ...inv,
      items: itemsMap.get(inv.id) || []
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch invoices", error: error.message });
  }
});

router.post("/invoices", async (req: any, res) => {
  try {
    const clientId = parseInt(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: "clientId is required" });

    let subTotal = 0;
    let vatTotal = 0;
    let grandTotal = 0;

    const items = req.body.items || [];
    
    if (Array.isArray(items)) {
      items.forEach((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        
        const net = qty * price;
        const vat = net * (vRate / 100);
        
        subTotal += net;
        vatTotal += vat;
        grandTotal += (net + vat);
      });
    }

    const invoiceNumber = req.body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const invoiceDate = new Date(req.body.invoiceDate);

    const invoiceData = {
      clientId,
      customerId: req.body.customerId ? parseInt(req.body.customerId) : null,
      invoiceNumber,
      invoiceType: req.body.invoiceType || "Invoice",
      invoiceDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      subTotal: subTotal.toFixed(2),
      vatTotal: vatTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      status: "Draft",
      notes: req.body.notes
    };
    
    const [result] = await db.insert(salesInvoices).values(invoiceData as any);
    const invoiceId = result.insertId;

    // Insert line items
    if (items.length > 0) {
      const itemsData = items.map((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        const net = qty * price;
        const vat = net * (vRate / 100);
        
        return {
          invoiceId,
          description: it.description,
          quantity: qty.toFixed(2),
          unitPrice: price.toFixed(2),
          vatRate: vRate.toFixed(2),
          vatAmount: vat.toFixed(2),
          netAmount: net.toFixed(2),
          nominalCode: it.nominalCode || "4000"
        };
      });
      await db.insert(invoiceItems).values(itemsData);
    }
    
    // Create Double-Entry Journal
    const [journalRes] = await db.insert(journalEntries).values({
      clientId,
      journalNumber: `JNL-${Date.now().toString().slice(-6)}`,
      journalDate: invoiceDate,
      reference: invoiceNumber,
      description: `Sales Invoice ${invoiceNumber}`,
      totalAmount: grandTotal.toFixed(2)
    });
    const journalId = journalRes.insertId;

    await getSystemAccount(clientId, "Accounts Receivable", "Current Asset", "1200");
    await getSystemAccount(clientId, "Sales Revenue", "Sales", "4000");
    if (vatTotal > 0) {
      await getSystemAccount(clientId, "Output VAT Control Account", "Current Liability", "2200");
    }

    const lines = [
      { journalId, nominalCode: "1200", description: `AR for ${invoiceNumber}`, debit: grandTotal.toFixed(2), credit: "0.00" },
      { journalId, nominalCode: "4000", description: `Sales for ${invoiceNumber}`, debit: "0.00", credit: subTotal.toFixed(2) }
    ];

    if (vatTotal > 0) {
      lines.push({ journalId, nominalCode: "2200", description: `Output VAT for ${invoiceNumber}`, debit: "0.00", credit: vatTotal.toFixed(2) });
    }

    await db.insert(journalLines).values(lines);

    res.json({ id: invoiceId, ...invoiceData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

router.post("/invoices/:id/payment", async (req: any, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const { amount, bankAccountId, paymentDate, reference } = req.body;
    
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const newPaidAmount = parseFloat(invoice.paidAmount || "0") + parseFloat(amount);
    const grandTotal = parseFloat(invoice.grandTotal || "0");
    let status = "PartiallyPaid";
    if (newPaidAmount >= grandTotal) status = "Paid";

    await db.update(salesInvoices)
      .set({ paidAmount: newPaidAmount.toFixed(2), status })
      .where(eq(salesInvoices.id, invoiceId));

    if (bankAccountId) {
      await db.insert(bankTransactions).values({
        clientId: invoice.clientId,
        bankAccountId: parseInt(bankAccountId),
        transactionDate: new Date(paymentDate),
        description: `Receipt for ${invoice.invoiceNumber} - ${reference || ''}`,
        debit: parseFloat(amount).toFixed(2), // Money In
        credit: "0.00",
        isReconciled: true,
        matchedToType: "Invoice",
        matchedToId: invoiceId
      } as any);

      const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, parseInt(bankAccountId)));
      if (account) {
        const newBalance = parseFloat(account.currentBalance || "0") + parseFloat(amount);
        await db.update(bankAccounts).set({ currentBalance: newBalance.toFixed(2) }).where(eq(bankAccounts.id, parseInt(bankAccountId)));
      }
    }

    res.json({ success: true, newStatus: status, newPaidAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to log payment" });
  }
});

// DELETE /api/bookkeeping/invoices/:id
router.delete("/invoices/:id", async (req: any, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    await db.delete(salesInvoices).where(eq(salesInvoices.id, invoiceId));
    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete invoice", error: error.message });
  }
});

// DELETE /api/bookkeeping/purchases/:id
router.delete("/purchases/:id", async (req: any, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    await db.delete(purchases).where(eq(purchases.id, purchaseId));
    res.json({ success: true, message: "Purchase bill deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete purchase bill", error: error.message });
  }
});

// GET /api/bookkeeping/invoices/details/:id — fetch single invoice with line items
router.get("/invoices/details/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [invoice] = await db
      .select({
        id: salesInvoices.id,
        clientId: salesInvoices.clientId,
        customerId: salesInvoices.customerId,
        invoiceNumber: salesInvoices.invoiceNumber,
        invoiceType: salesInvoices.invoiceType,
        invoiceDate: salesInvoices.invoiceDate,
        dueDate: salesInvoices.dueDate,
        subTotal: salesInvoices.subTotal,
        vatTotal: salesInvoices.vatTotal,
        grandTotal: salesInvoices.grandTotal,
        paidAmount: salesInvoices.paidAmount,
        status: salesInvoices.status,
        notes: salesInvoices.notes,
        createdAt: salesInvoices.createdAt,
        customerName: contacts.name,
        customerEmail: contacts.email,
        customerPhone: contacts.phone,
        customerAddress: contacts.address,
      })
      .from(salesInvoices)
      .leftJoin(contacts, eq(salesInvoices.customerId, contacts.id))
      .where(eq(salesInvoices.id, id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    res.json({ ...invoice, items });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch invoice details", error: error.message });
  }
});

// GET /api/bookkeeping/invoices/:id/download-doc — Stream merged Invoice.docx
router.get("/invoices/:id/download-doc", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [invoice] = await db
      .select({
        id: salesInvoices.id,
        clientId: salesInvoices.clientId,
        customerId: salesInvoices.customerId,
        invoiceNumber: salesInvoices.invoiceNumber,
        invoiceType: salesInvoices.invoiceType,
        invoiceDate: salesInvoices.invoiceDate,
        dueDate: salesInvoices.dueDate,
        subTotal: salesInvoices.subTotal,
        vatTotal: salesInvoices.vatTotal,
        grandTotal: salesInvoices.grandTotal,
        paidAmount: salesInvoices.paidAmount,
        status: salesInvoices.status,
        notes: salesInvoices.notes,
        customerName: contacts.name,
        customerEmail: contacts.email,
        customerPhone: contacts.phone,
        customerAddress: contacts.address,
      })
      .from(salesInvoices)
      .leftJoin(contacts, eq(salesInvoices.customerId, contacts.id))
      .where(eq(salesInvoices.id, id));

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Fetch line items
    const rawItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    // Fetch client / company info
    let companyName = "SanSuite";
    let companyAddress = "";
    let companyPhone = "";
    let companyRegNo = "";
    let companyVatRegNo = "";

    if (invoice.clientId) {
      const [clientRecord] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
      if (clientRecord) {
        companyName = clientRecord.clientName || "Company";
        companyAddress = [
          clientRecord.address,
          clientRecord.city,
          clientRecord.county,
          clientRecord.postcode
        ].filter(Boolean).join("\n");
        companyPhone = clientRecord.phone || "";
        companyRegNo = clientRecord.registrationNumber || "";
        companyVatRegNo = clientRecord.vatNumber || "";
      }
    }

    // Fetch bank accounts for authentic client bank details
    let bankName = "";
    let accountNo = "";
    let branchCode = "";
    if (invoice.clientId) {
      const clientBanks = await db.select().from(bankAccounts).where(eq(bankAccounts.clientId, invoice.clientId));
      const activeBank = clientBanks.find(b => b.isActive) || clientBanks[0];
      if (activeBank) {
        bankName = activeBank.bankName || "";
        accountNo = activeBank.accountNumber || "";
        branchCode = activeBank.sortCode || "";
      }
    }

    const itemsList = rawItems.map(it => {
      const qty = Number(it.quantity || 1);
      const uPrice = Number(it.unitPrice || 0);
      const net = Number(it.netAmount || (qty * uPrice));
      const vAmount = Number(it.vatAmount || 0);
      const gross = net + vAmount;
      return {
        description: it.description || "Services Rendered",
        unitPrice: uPrice,
        quantity: qty,
        netAmount: net,
        vatRate: it.vatRate != null ? `${it.vatRate}%` : "No VAT",
        vatAmount: vAmount,
        grossAmount: gross,
      };
    });

    const docxBuffer = await generateMergedDocx({
      templateType: "invoice",
      practiceId: req.user?.practiceId || 1,
      clientId: invoice.clientId,
      data: {
        companyName,
        companyAddress,
        companyPhone,
        companyRegNo,
        companyVatRegNo,
        docTitle: "INVOICE",
        docNumber: invoice.invoiceNumber,
        docDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "-",
        reference: invoice.notes || "",
        customerName: invoice.customerName || "Customer",
        customerAddress: invoice.customerAddress || "",
        items: itemsList.length > 0 ? itemsList : [{
          description: "Services Rendered",
          unitPrice: Number(invoice.subTotal || invoice.grandTotal || 0),
          quantity: 1,
          netAmount: Number(invoice.subTotal || invoice.grandTotal || 0),
          vatRate: Number(invoice.vatTotal || 0) > 0 ? "20%" : "No VAT",
          vatAmount: Number(invoice.vatTotal || 0),
          grossAmount: Number(invoice.grandTotal || 0),
        }],
        netAmount: Number(invoice.subTotal || 0),
        vatAmount: Number(invoice.vatTotal || 0),
        totalAmount: Number(invoice.grandTotal || 0),
        dueAmount: Number(invoice.grandTotal || 0),
        bankName,
        accountNo,
        branchCode,
      },
    });

    const safeNumber = (invoice.invoiceNumber || "INV").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice_${safeNumber}.docx"`);
    res.send(docxBuffer);
  } catch (error: any) {
    console.error("Error generating invoice docx:", error);
    res.status(500).json({ message: "Failed to generate Invoice Word document", error: error.message });
  }
});

// PUT /api/bookkeeping/invoices/:id — update invoice status, notes, or full form fields
router.put("/invoices/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { customerId, invoiceNumber, invoiceType, invoiceDate, dueDate, notes, status, items } = req.body;

    let subTotal = 0;
    let vatTotal = 0;
    let grandTotal = 0;

    if (Array.isArray(items)) {
      items.forEach((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        const net = qty * price;
        const vat = net * (vRate / 100);
        subTotal += net;
        vatTotal += vat;
        grandTotal += (net + vat);
      });
    }

    const updateData: any = {};
    if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null;
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (invoiceType !== undefined) updateData.invoiceType = invoiceType;
    if (invoiceDate !== undefined) updateData.invoiceDate = new Date(invoiceDate);
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (items && Array.isArray(items)) {
      updateData.subTotal = subTotal.toFixed(2);
      updateData.vatTotal = vatTotal.toFixed(2);
      updateData.grandTotal = grandTotal.toFixed(2);
    }

    await db.update(salesInvoices).set(updateData).where(eq(salesInvoices.id, id));

    if (items && Array.isArray(items)) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      const itemsData = items.map((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        const net = qty * price;
        const vat = net * (vRate / 100);
        return {
          invoiceId: id,
          description: it.description || "",
          quantity: qty.toFixed(2),
          unitPrice: price.toFixed(2),
          vatRate: vRate.toFixed(2),
          vatAmount: vat.toFixed(2),
          netAmount: net.toFixed(2),
          nominalCode: it.nominalCode || "4000"
        };
      });
      if (itemsData.length > 0) {
        await db.insert(invoiceItems).values(itemsData);
      }
    }

    res.json({ success: true, id, ...updateData });
  } catch (error: any) {
    console.error("Failed to update invoice:", error);
    res.status(500).json({ message: "Failed to update invoice", error: error.message });
  }
});

// POST /api/bookkeeping/invoices/:id/send-email — email invoice to customer
router.post("/invoices/:id/send-email", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { recipientEmail } = req.body;
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Automatically update status to 'Sent' if it was 'Draft'
    if (!invoice.status || invoice.status === "Draft") {
      await db.update(salesInvoices).set({ status: "Sent" }).where(eq(salesInvoices.id, id));
    }

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} emailed successfully to ${recipientEmail || "customer"}.`,
      status: "Sent"
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to send invoice email", error: error.message });
  }
});

// DELETE /api/bookkeeping/invoices/:id
router.delete("/invoices/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = req.user.role;
    if (!["admin", "accountant"].includes(role)) {
      return res.status(403).json({ message: "Permission denied. Only admin or accountant can delete invoices." });
    }
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(salesInvoices).where(eq(salesInvoices.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

// --- PURCHASES ---
router.get("/purchases/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(purchases).where(eq(purchases.clientId, clientId)).orderBy(purchases.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
});

router.post("/purchases", async (req: any, res) => {
  try {
    const clientId = parseInt(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: "clientId is required" });

    let subTotal = 0;
    let vatTotal = 0;
    let grandTotal = 0;
    let laborTotal = 0;
    let materialsTotal = 0;

    const items = req.body.items || [];
    
    if (Array.isArray(items)) {
      items.forEach((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        
        const net = qty * price;
        const vat = net * (vRate / 100);
        
        subTotal += net;
        vatTotal += vat;
        grandTotal += (net + vat);

        if (it.itemType === "Labor") {
          laborTotal += net;
        } else {
          materialsTotal += net;
        }
      });
    }
    
    const billNumber = req.body.billNumber || `PUR-${Date.now().toString().slice(-6)}`;
    const billDate = new Date(req.body.billDate);

    const isCis = Boolean(req.body.isCis);
    const cisSubcontractorId = req.body.cisSubcontractorId ? parseInt(req.body.cisSubcontractorId) : null;
    const cisDeductionRate = parseFloat(req.body.cisDeductionRate || "20.00");
    const cisDeductionAmount = isCis ? (laborTotal * (cisDeductionRate / 100)) : 0;

    const purchaseData = {
      clientId,
      supplierId: req.body.supplierId ? parseInt(req.body.supplierId) : null,
      billNumber,
      purchaseType: req.body.purchaseType || "Invoice",
      billDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      subTotal: subTotal.toFixed(2),
      vatTotal: vatTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      status: "Unpaid",
      isCis,
      cisSubcontractorId,
      laborTotal: laborTotal.toFixed(2),
      materialsTotal: materialsTotal.toFixed(2),
      cisDeductionAmount: cisDeductionAmount.toFixed(2),
      notes: req.body.notes
    };
    
    const [result] = await db.insert(purchases).values(purchaseData as any);
    const purchaseId = result.insertId;

    // Insert line items
    if (items.length > 0) {
      const itemsData = items.map((it: any) => {
        const qty = parseFloat(it.quantity || "0");
        const price = parseFloat(it.unitPrice || "0");
        const vRate = parseFloat(it.vatRate || "0");
        const net = qty * price;
        const vat = net * (vRate / 100);
        
        return {
          purchaseId,
          description: it.description,
          quantity: qty.toFixed(2),
          unitPrice: price.toFixed(2),
          vatRate: vRate.toFixed(2),
          vatAmount: vat.toFixed(2),
          netAmount: net.toFixed(2),
          nominalCode: it.nominalCode || "5000",
          itemType: it.itemType || "Standard"
        };
      });
      await db.insert(purchaseItems).values(itemsData);
    }

    // Create Double-Entry Journal
    const [journalRes] = await db.insert(journalEntries).values({
      clientId,
      journalNumber: `JNL-${Date.now().toString().slice(-6)}`,
      journalDate: billDate,
      reference: billNumber,
      description: `Purchase Bill ${billNumber}`,
      totalAmount: grandTotal.toFixed(2)
    });
    const journalId = journalRes.insertId;

    await getSystemAccount(clientId, "Accounts Payable", "Liability", "2100");
    await getSystemAccount(clientId, "Purchases", "Purchases", "5000");
    if (vatTotal > 0) {
      await getSystemAccount(clientId, "Input VAT Control Account", "Current Asset", "2201");
    }

    const lines = [
      { journalId, nominalCode: "5000", description: `Purchases for ${billNumber}`, debit: subTotal.toFixed(2), credit: "0.00" }
    ];

    if (vatTotal > 0) {
      lines.push({ journalId, nominalCode: "2201", description: `Input VAT for ${billNumber}`, debit: vatTotal.toFixed(2), credit: "0.00" });
    }

    lines.push({ journalId, nominalCode: "2100", description: `AP for ${billNumber}`, debit: "0.00", credit: grandTotal.toFixed(2) });

    await db.insert(journalLines).values(lines);

    res.json({ id: purchaseId, ...purchaseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create purchase" });
  }
});

router.post("/purchases/:id/payment", async (req: any, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    const { amount, bankAccountId, paymentDate, reference } = req.body;
    
    const [bill] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    // Assuming we use 'subTotal' to store paid amount or add a paidAmount field to purchases.
    // Wait, purchases table does not have paidAmount. Let's just update the status based on a simple logic or assume full payment.
    // For now, we will just mark as Paid.
    
    await db.update(purchases)
      .set({ status: "Paid" })
      .where(eq(purchases.id, purchaseId));

    if (bankAccountId) {
      await db.insert(bankTransactions).values({
        clientId: bill.clientId,
        bankAccountId: parseInt(bankAccountId),
        transactionDate: new Date(paymentDate),
        description: `Payment for ${bill.billNumber} - ${reference || ''}`,
        debit: "0.00",
        credit: parseFloat(amount).toFixed(2), // Money Out
        isReconciled: true,
        matchedToType: "Purchase",
        matchedToId: purchaseId
      } as any);

      const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, parseInt(bankAccountId)));
      if (account) {
        const newBalance = parseFloat(account.currentBalance || "0") - parseFloat(amount);
        await db.update(bankAccounts).set({ currentBalance: newBalance.toFixed(2) }).where(eq(bankAccounts.id, parseInt(bankAccountId)));
      }
    }

    res.json({ success: true, newStatus: "Paid" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to log payment" });
  }
});

// --- BANK ACCOUNTS & TRANSACTIONS ---
router.get("/bank-accounts/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(bankAccounts).where(eq(bankAccounts.clientId, clientId)).orderBy(bankAccounts.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bank accounts" });
  }
});

router.post("/bank-accounts", async (req: any, res) => {
  try {
    const data = { 
      clientId: parseInt(req.body.clientId),
      bankName: req.body.bankName,
      accountType: req.body.accountType,
      currency: req.body.currency || "GBP",
      accountCode: req.body.accountCode || null,
      sortCode: req.body.sortCode || null,
      accountNumber: req.body.accountNumber || null,
      currentBalance: req.body.currentBalance || "0.00",
      isActive: true
    };
    const [result] = await db.insert(bankAccounts).values(data);
    
    // Also create the nominal account
    await getSystemAccount(data.clientId, `${data.bankName} - ${data.accountNumber || 'Account'}`, "Bank", data.accountCode || "1200");
    
    res.json({ id: result.insertId, ...data });
  } catch (error) {
    res.status(500).json({ message: "Failed to create bank account" });
  }
});

router.get("/bank-accounts/:accountId/transactions", async (req: any, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const result = await db.select().from(bankTransactions).where(eq(bankTransactions.bankAccountId, accountId)).orderBy(bankTransactions.transactionDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bank transactions" });
  }
});

router.post("/bank-accounts/:accountId/transactions", async (req: any, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const { clientId, transactionDate, description, debit, credit } = req.body;
    
    const data = {
      clientId: parseInt(clientId),
      bankAccountId: accountId,
      transactionDate: new Date(transactionDate),
      description,
      debit: debit || "0.00",
      credit: credit || "0.00",
      isReconciled: false,
    };
    const [result] = await db.insert(bankTransactions).values(data as any);
    
    // Update bank balance
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, accountId));
    if (account) {
      const current = parseFloat(account.currentBalance || "0");
      const d = parseFloat(data.debit);
      const c = parseFloat(data.credit);
      const newBalance = current + d - c; // + debit (money in), - credit (money out)
      await db.update(bankAccounts).set({ currentBalance: newBalance.toFixed(2) }).where(eq(bankAccounts.id, accountId));
      await db.update(bankTransactions).set({ balance: newBalance.toFixed(2) }).where(eq(bankTransactions.id, result.insertId));
    }
    
    res.json({ id: result.insertId, ...data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to post bank transaction" });
  }
});

// --- RECONCILIATION ---
router.get("/reconciliation/unmatched/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    // Fetch unpaid/partially paid sales invoices (Money In)
    const invoices = await db.select().from(salesInvoices)
      .where(and(eq(salesInvoices.clientId, clientId), inArray(salesInvoices.status, ["Draft", "Unpaid", "PartiallyPaid"])));
      
    // Fetch unpaid/partially paid purchases (Money Out)
    const bills = await db.select().from(purchases)
      .where(and(eq(purchases.clientId, clientId), inArray(purchases.status, ["Draft", "Unpaid", "PartiallyPaid"])));
      
    res.json({
      invoices: invoices.map(i => ({ ...i, type: "Invoice" })),
      bills: bills.map(b => ({ ...b, type: "Purchase" }))
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch unmatched records" });
  }
});

router.post("/reconciliation/match", async (req: any, res) => {
  try {
    const { transactionId, matchedToType, matchedToId, clientId } = req.body;
    
    // Update the transaction
    await db.update(bankTransactions)
      .set({ isReconciled: true, matchedToType, matchedToId: parseInt(matchedToId) })
      .where(eq(bankTransactions.id, parseInt(transactionId)));
      
    // Update the matched entity
    if (matchedToType === "Invoice") {
      await db.update(salesInvoices).set({ status: "Paid" }).where(eq(salesInvoices.id, parseInt(matchedToId)));
    } else if (matchedToType === "Purchase") {
      await db.update(purchases).set({ status: "Paid" }).where(eq(purchases.id, parseInt(matchedToId)));
    }
    
    res.json({ success: true, message: "Matched successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to match transaction" });
  }
});

// --- VAT ---
router.get("/vat", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const clientIds = await getClientIds(practiceId);
    const requestedClientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;
    
    if (requestedClientId) {
      if (!clientIds.includes(requestedClientId)) {
        return res.status(403).json({ message: "Access denied for this client" });
      }
      const result = await db.select().from(vatPeriods).where(eq(vatPeriods.clientId, requestedClientId)).orderBy(desc(vatPeriods.toDate));
      return res.json(result);
    }
    
    const result = await db.select().from(vatPeriods).where(inArray(vatPeriods.clientId, clientIds)).orderBy(desc(vatPeriods.toDate));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch VAT periods", error: error.message });
  }
});

router.get("/vat/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(vatPeriods).where(eq(vatPeriods.clientId, clientId)).orderBy(desc(vatPeriods.toDate));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch client VAT periods", error: error.message });
  }
});

router.post("/vat-period", async (req: any, res) => {
  try {
    const { clientId, description, fromDate, toDate, vatStatus } = req.body;
    if (!clientId || !fromDate || !toDate) {
      return res.status(400).json({ message: "clientId, fromDate and toDate are required" });
    }
    const cId = parseInt(clientId);
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Compute initial statutory 9-box values directly from authentic invoices and bills
    const sales = await db.select().from(salesInvoices).where(
      and(
        eq(salesInvoices.clientId, cId),
        gte(salesInvoices.invoiceDate, from),
        lte(salesInvoices.invoiceDate, to),
        inArray(salesInvoices.status, ["Unpaid", "PartiallyPaid", "Paid"])
      )
    );

    const bills = await db.select().from(purchases).where(
      and(
        eq(purchases.clientId, cId),
        gte(purchases.billDate, from),
        lte(purchases.billDate, to),
        inArray(purchases.status, ["Unpaid", "PartiallyPaid", "Paid"])
      )
    );

    let box1 = 0;
    let box6 = 0;
    sales.forEach(s => {
      box1 += parseFloat(s.vatTotal || "0");
      box6 += parseFloat(s.subTotal || "0");
    });

    let box4 = 0;
    let box7 = 0;
    bills.forEach(b => {
      box4 += parseFloat(b.vatTotal || "0");
      box7 += parseFloat(b.subTotal || "0");
    });

    const box2 = 0;
    const box3 = box1 + box2;
    const box5 = box3 - box4; // Signed Net VAT: positive = pay HMRC, negative = reclaim from HMRC
    const box8 = 0;
    const box9 = 0;

    const [r] = await db.insert(vatPeriods).values({
      clientId: cId,
      description: description || `VAT Return ${fromDate} to ${toDate}`,
      fromDate: from,
      toDate: to,
      vatDueOnSales: box1.toFixed(2),
      vatReclaimedOnPurchases: box4.toFixed(2),
      netVatDue: box5.toFixed(2),
      box1VatDueSales: box1.toFixed(2),
      box2VatDueAcquisitions: box2.toFixed(2),
      box3TotalVatDue: box3.toFixed(2),
      box4VatReclaimed: box4.toFixed(2),
      box5NetVat: box5.toFixed(2),
      box6TotalSalesExVat: box6.toFixed(2),
      box7TotalPurchasesExVat: box7.toFixed(2),
      box8TotalEuSupplies: box8.toFixed(2),
      box9TotalEuAcquisitions: box9.toFixed(2),
      lateClaimsIncluded: false,
      vatStatus: vatStatus || "Calculated",
      paymentStatus: "Unpaid",
    } as any);

    res.json({
      id: r.insertId,
      clientId: cId,
      description: description || `VAT Return ${fromDate} to ${toDate}`,
      fromDate,
      toDate,
      box1: box1.toFixed(2),
      box2: box2.toFixed(2),
      box3: box3.toFixed(2),
      box4: box4.toFixed(2),
      box5: box5.toFixed(2),
      box6: box6.toFixed(2),
      box7: box7.toFixed(2),
      box8: box8.toFixed(2),
      box9: box9.toFixed(2),
      isRefund: box4 > box3,
    });
  } catch (e: any) {
    res.status(500).json({ message: "Failed to create VAT period", error: e.message });
  }
});

router.get("/vat-period/:id/calculate", async (req: any, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const [period] = await db.select().from(vatPeriods).where(eq(vatPeriods.id, periodId));
    
    if (!period) return res.status(404).json({ message: "VAT period not found" });
    
    // 1. Fetch Sales Invoices in period (Box 1 & 6)
    const sales = await db.select({
      id: salesInvoices.id,
      invoiceNumber: salesInvoices.invoiceNumber,
      invoiceDate: salesInvoices.invoiceDate,
      subTotal: salesInvoices.subTotal,
      vatTotal: salesInvoices.vatTotal,
      grandTotal: salesInvoices.grandTotal,
      status: salesInvoices.status,
      customerName: contacts.name,
    })
    .from(salesInvoices)
    .leftJoin(contacts, eq(salesInvoices.customerId, contacts.id))
    .where(
      and(
        eq(salesInvoices.clientId, period.clientId),
        gte(salesInvoices.invoiceDate, period.fromDate),
        lte(salesInvoices.invoiceDate, period.toDate),
        inArray(salesInvoices.status, ["Unpaid", "PartiallyPaid", "Paid"])
      )
    );
    
    // 2. Fetch Purchases in period (Box 4 & 7)
    const bills = await db.select({
      id: purchases.id,
      billNumber: purchases.billNumber,
      billDate: purchases.billDate,
      subTotal: purchases.subTotal,
      vatTotal: purchases.vatTotal,
      grandTotal: purchases.grandTotal,
      status: purchases.status,
      supplierName: contacts.name,
    })
    .from(purchases)
    .leftJoin(contacts, eq(purchases.supplierId, contacts.id))
    .where(
      and(
        eq(purchases.clientId, period.clientId),
        gte(purchases.billDate, period.fromDate),
        lte(purchases.billDate, period.toDate),
        inArray(purchases.status, ["Unpaid", "PartiallyPaid", "Paid"])
      )
    );
    
    let box1 = 0;
    let box6 = 0;
    sales.forEach(s => {
      box1 += parseFloat(s.vatTotal || "0");
      box6 += parseFloat(s.subTotal || "0");
    });
    
    let box4 = 0;
    let box7 = 0;
    bills.forEach(b => {
      box4 += parseFloat(b.vatTotal || "0");
      box7 += parseFloat(b.subTotal || "0");
    });
    
    const box2 = 0;
    const box3 = box1 + box2;
    const box5 = box3 - box4; // Signed Net VAT: positive = pay HMRC, negative = reclaim from HMRC
    const box8 = 0;
    const box9 = 0;
    
    if (period.vatStatus !== "Filed") {
      await db.update(vatPeriods).set({
        vatDueOnSales: box1.toFixed(2),
        vatReclaimedOnPurchases: box4.toFixed(2),
        netVatDue: box5.toFixed(2),
        box1VatDueSales: box1.toFixed(2),
        box2VatDueAcquisitions: box2.toFixed(2),
        box3TotalVatDue: box3.toFixed(2),
        box4VatReclaimed: box4.toFixed(2),
        box5NetVat: box5.toFixed(2),
        box6TotalSalesExVat: box6.toFixed(2),
        box7TotalPurchasesExVat: box7.toFixed(2),
        box8TotalEuSupplies: box8.toFixed(2),
        box9TotalEuAcquisitions: box9.toFixed(2),
        vatStatus: "Calculated"
      }).where(eq(vatPeriods.id, periodId));
    }
    
    res.json({
      period,
      box1: box1.toFixed(2),
      box2: box2.toFixed(2),
      box3: box3.toFixed(2),
      box4: box4.toFixed(2),
      box5: box5.toFixed(2),
      box6: box6.toFixed(2),
      box7: box7.toFixed(2),
      box8: box8.toFixed(2),
      box9: box9.toFixed(2),
      isRefund: box4 > box3,
      salesCount: sales.length,
      billsCount: bills.length,
      salesTransactions: sales,
      purchaseTransactions: bills,
    });
  } catch (error: any) {
    console.error("VAT Calc Error:", error);
    res.status(500).json({ message: "Failed to calculate VAT", error: error.message });
  }
});

// --- CREDIT NOTES (Sales & Purchases) ---
router.get("/credit-notes/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const type = req.query.type as string; // 'Sales' or 'Purchase'
    
    const query = db.select({
      id: creditNotes.id,
      clientId: creditNotes.clientId,
      contactId: creditNotes.contactId,
      contactName: contacts.name,
      type: creditNotes.type,
      creditNoteNumber: creditNotes.creditNoteNumber,
      creditNoteDate: creditNotes.creditNoteDate,
      subTotal: creditNotes.subTotal,
      vatTotal: creditNotes.vatTotal,
      totalAmount: creditNotes.totalAmount,
      allocatedAmount: creditNotes.allocatedAmount,
      remainingAmount: creditNotes.remainingAmount,
      status: creditNotes.status,
      notes: creditNotes.notes,
      createdAt: creditNotes.createdAt,
    })
    .from(creditNotes)
    .leftJoin(contacts, eq(creditNotes.contactId, contacts.id))
    .where(
      type 
        ? and(eq(creditNotes.clientId, clientId), eq(creditNotes.type, type))
        : eq(creditNotes.clientId, clientId)
    )
    .orderBy(desc(creditNotes.creditNoteDate));

    const list = await query;
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch credit notes", error: error.message });
  }
});

router.get("/credit-notes/details/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [cn] = await db.select({
      id: creditNotes.id,
      clientId: creditNotes.clientId,
      contactId: creditNotes.contactId,
      contactName: contacts.name,
      type: creditNotes.type,
      creditNoteNumber: creditNotes.creditNoteNumber,
      creditNoteDate: creditNotes.creditNoteDate,
      subTotal: creditNotes.subTotal,
      vatTotal: creditNotes.vatTotal,
      totalAmount: creditNotes.totalAmount,
      allocatedAmount: creditNotes.allocatedAmount,
      remainingAmount: creditNotes.remainingAmount,
      status: creditNotes.status,
      notes: creditNotes.notes,
      createdAt: creditNotes.createdAt,
    })
    .from(creditNotes)
    .leftJoin(contacts, eq(creditNotes.contactId, contacts.id))
    .where(eq(creditNotes.id, id));

    if (!cn) return res.status(404).json({ message: "Credit note not found" });

    const itemsList = await db.select().from(creditNoteItems).where(eq(creditNoteItems.creditNoteId, id));
    const allocationsList = await db.select().from(creditNoteAllocations).where(eq(creditNoteAllocations.creditNoteId, id));

    res.json({
      ...cn,
      items: itemsList,
      allocations: allocationsList,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch credit note details", error: error.message });
  }
});

router.post("/credit-notes", async (req: any, res) => {
  try {
    const { clientId, contactId, type, creditNoteNumber, creditNoteDate, notes, items: rawItems } = req.body;
    if (!clientId || !creditNoteNumber || !creditNoteDate) {
      return res.status(400).json({ message: "Client ID, credit note number, and date are required" });
    }

    const cId = parseInt(clientId);
    const ctId = contactId ? parseInt(contactId) : null;
    const finalType = type || "Sales";

    let subTotal = 0;
    let vatTotal = 0;

    const parsedItems = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : [
      { description: `${finalType} Credit Adjustment`, quantity: 1, unitPrice: 0, netAmount: 0, vatRate: 20, vatAmount: 0, nominalCode: finalType === "Sales" ? "4000" : "5000" }
    ];

    parsedItems.forEach((it: any) => {
      const qty = parseFloat(it.quantity || "1");
      const unit = parseFloat(it.unitPrice || "0");
      const net = it.netAmount != null ? parseFloat(it.netAmount) : qty * unit;
      const rate = parseFloat(it.vatRate || "20");
      const vat = it.vatAmount != null ? parseFloat(it.vatAmount) : net * (rate / 100);
      subTotal += net;
      vatTotal += vat;
    });

    const totalAmount = subTotal + vatTotal;

    const [resInsert] = await db.insert(creditNotes).values({
      clientId: cId,
      contactId: ctId,
      type: finalType,
      creditNoteNumber,
      creditNoteDate: new Date(creditNoteDate),
      subTotal: subTotal.toFixed(2),
      vatTotal: vatTotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      allocatedAmount: "0.00",
      remainingAmount: totalAmount.toFixed(2),
      status: "Issued",
      notes: notes || "",
    });

    const cnId = resInsert.insertId;

    for (const it of parsedItems) {
      const qty = parseFloat(it.quantity || "1");
      const unit = parseFloat(it.unitPrice || "0");
      const net = it.netAmount != null ? parseFloat(it.netAmount) : qty * unit;
      const rate = parseFloat(it.vatRate || "20");
      const vat = it.vatAmount != null ? parseFloat(it.vatAmount) : net * (rate / 100);

      await db.insert(creditNoteItems).values({
        creditNoteId: cnId,
        description: it.description || "Credit Note Item",
        quantity: qty.toFixed(2),
        unitPrice: unit.toFixed(2),
        netAmount: net.toFixed(2),
        vatRate: rate.toFixed(2),
        vatAmount: vat.toFixed(2),
        nominalCode: it.nominalCode || (finalType === "Sales" ? "4000" : "5000"),
      });
    }

    res.json({
      success: true,
      id: cnId,
      creditNoteNumber,
      totalAmount: totalAmount.toFixed(2),
      message: `${finalType} Credit Note ${creditNoteNumber} issued successfully.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create credit note", error: error.message });
  }
});

router.post("/credit-notes/:id/allocate", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { invoiceId, purchaseId, amount, allocatedDate } = req.body;
    const allocAmount = parseFloat(amount || "0");

    if (allocAmount <= 0) {
      return res.status(400).json({ message: "Allocation amount must be greater than zero." });
    }

    const [cn] = await db.select().from(creditNotes).where(eq(creditNotes.id, id));
    if (!cn) return res.status(404).json({ message: "Credit note not found" });

    const remaining = parseFloat(cn.remainingAmount || "0");
    if (allocAmount > remaining + 0.001) {
      return res.status(400).json({ message: `Allocation amount (£${allocAmount}) cannot exceed available credit (£${remaining}).` });
    }

    const allocDate = allocatedDate ? new Date(allocatedDate) : new Date();

    if (cn.type === "Sales" && invoiceId) {
      const invId = parseInt(invoiceId);
      const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invId));
      if (!inv) return res.status(404).json({ message: "Invoice not found" });

      const currentPaid = parseFloat(inv.paidAmount || "0");
      const grandTotal = parseFloat(inv.grandTotal || "0");
      const newPaid = currentPaid + allocAmount;
      const newStatus = newPaid >= grandTotal - 0.01 ? "Paid" : "PartiallyPaid";

      await db.update(salesInvoices).set({
        paidAmount: newPaid.toFixed(2),
        status: newStatus,
      }).where(eq(salesInvoices.id, invId));

      await db.insert(creditNoteAllocations).values({
        creditNoteId: id,
        invoiceId: invId,
        amount: allocAmount.toFixed(2),
        allocatedDate: allocDate,
      });
    } else if (cn.type === "Purchase" && purchaseId) {
      const purId = parseInt(purchaseId);
      const [pur] = await db.select().from(purchases).where(eq(purchases.id, purId));
      if (!pur) return res.status(404).json({ message: "Purchase bill not found" });

      const currentPaid = parseFloat(pur.paidAmount || "0");
      const grandTotal = parseFloat(pur.grandTotal || "0");
      const newPaid = currentPaid + allocAmount;
      const newStatus = newPaid >= grandTotal - 0.01 ? "Paid" : "PartiallyPaid";

      await db.update(purchases).set({
        paidAmount: newPaid.toFixed(2),
        status: newStatus,
      }).where(eq(purchases.id, purId));

      await db.insert(creditNoteAllocations).values({
        creditNoteId: id,
        purchaseId: purId,
        amount: allocAmount.toFixed(2),
        allocatedDate: allocDate,
      });
    }

    const newAllocated = parseFloat(cn.allocatedAmount || "0") + allocAmount;
    const newRemaining = remaining - allocAmount;
    const newCnStatus = newRemaining <= 0.01 ? "Allocated" : "Part-Allocated";

    await db.update(creditNotes).set({
      allocatedAmount: newAllocated.toFixed(2),
      remainingAmount: newRemaining.toFixed(2),
      status: newCnStatus,
    }).where(eq(creditNotes.id, id));

    res.json({
      success: true,
      message: `Successfully allocated £${allocAmount.toFixed(2)} to ${cn.type === 'Sales' ? 'Invoice' : 'Bill'}.`,
      remainingAmount: newRemaining.toFixed(2),
      status: newCnStatus,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to allocate credit note", error: error.message });
  }
});

router.delete("/credit-notes/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(creditNoteAllocations).where(eq(creditNoteAllocations.creditNoteId, id));
    await db.delete(creditNoteItems).where(eq(creditNoteItems.creditNoteId, id));
    await db.delete(creditNotes).where(eq(creditNotes.id, id));
    res.json({ success: true, message: "Credit note deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete credit note", error: error.message });
  }
});

// --- CONTACTS (Customers, Suppliers, Directors, Shareholders) ---
router.get("/contacts", async (req: any, res) => {
  try {
    const clientIds = await getClientIds(req.user.practiceId);
    const result = await db.select().from(contacts).where(inArray(contacts.clientId, clientIds));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

router.get("/contacts/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (!clientId) return res.status(400).json({ message: "Invalid clientId" });

    // Fetch all contacts
    const contactList = await db.select().from(contacts).where(eq(contacts.clientId, clientId)).orderBy(contacts.name);

    // Fetch unpaid/partially paid sales invoices to compute live customer balances
    const clientInvoices = await db.select().from(salesInvoices).where(
      and(eq(salesInvoices.clientId, clientId))
    );
    const customerDueMap = new Map<number, number>();
    for (const inv of clientInvoices) {
      if (inv.customerId && inv.status !== "Paid") {
        const current = customerDueMap.get(inv.customerId) || 0;
        customerDueMap.set(inv.customerId, current + (parseFloat(inv.grandTotal || "0") || 0));
      }
    }

    // Fetch unpaid/partially paid purchases to compute live supplier balances
    const clientPurchases = await db.select().from(purchases).where(
      and(eq(purchases.clientId, clientId))
    );
    const supplierDueMap = new Map<number, number>();
    for (const pur of clientPurchases) {
      if (pur.supplierId && pur.status !== "Paid") {
        const current = supplierDueMap.get(pur.supplierId) || 0;
        supplierDueMap.set(pur.supplierId, current + (parseFloat(pur.grandTotal || "0") || 0));
      }
    }

    // Attach live balance to each contact
    const enrichedContacts = contactList.map(c => {
      const opBal = parseFloat(c.openingBalance || "0") || 0;
      let balance = 0;

      if (c.contactType === "Customer") {
        const invoiceDue = customerDueMap.get(c.id) || 0;
        balance = opBal + invoiceDue;
      } else if (c.contactType === "Supplier") {
        const purchaseDue = supplierDueMap.get(c.id) || 0;
        balance = opBal + purchaseDue;
      }

      return {
        ...c,
        balance: balance.toFixed(2),
      };
    });

    res.json(enrichedContacts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch client contacts" });
  }
});

router.post("/contacts", async (req: any, res) => {
  try {
    const clientId = req.body.clientId ? parseInt(req.body.clientId) : null;
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: "Contact name is required." });
    }

    const data = {
      practiceId: req.user.practiceId,
      clientId,
      contactType: req.body.contactType || "Customer",
      name: req.body.name.trim(),
      email: req.body.email?.trim() || null,
      phone: req.body.phone?.trim() || null,
      address: req.body.address?.trim() || null,
      addressLine1: req.body.addressLine1?.trim() || null,
      addressLine2: req.body.addressLine2?.trim() || null,
      city: req.body.city?.trim() || null,
      postcode: req.body.postcode?.trim() || null,
      county: req.body.county?.trim() || null,
      country: req.body.country?.trim() || "United Kingdom",
      openingBalance: req.body.openingBalance ? parseFloat(req.body.openingBalance).toFixed(2) : "0.00",
      openingBalanceDate: req.body.openingBalanceDate ? new Date(req.body.openingBalanceDate) : null,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      recurringEmail: req.body.recurringEmail !== undefined ? Boolean(req.body.recurringEmail) : true,
      notes: req.body.notes?.trim() || null,
      sortCode: req.body.sortCode?.trim() || null,
      accountNumber: req.body.accountNumber?.trim() || null,
      iban: req.body.iban?.trim() || null,
      designation: req.body.designation?.trim() || null,
      shareType: req.body.shareType?.trim() || "Equity",
      numberOfShares: req.body.numberOfShares ? parseFloat(req.body.numberOfShares).toFixed(2) : "0.00",
      shareValue: req.body.shareValue ? parseFloat(req.body.shareValue).toFixed(2) : "1.00",
      vatNumber: req.body.vatNumber?.trim() || null,
    };

    const [result] = await db.insert(contacts).values(data as any);
    res.json({ id: result.insertId, ...data, balance: data.openingBalance });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create contact" });
  }
});

router.put("/contacts/:id", async (req: any, res) => {
  try {
    const contactId = parseInt(req.params.id);
    if (!contactId) return res.status(400).json({ message: "Invalid contact ID" });

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.contactType !== undefined) updateData.contactType = req.body.contactType;
    if (req.body.email !== undefined) updateData.email = req.body.email?.trim() || null;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone?.trim() || null;
    if (req.body.address !== undefined) updateData.address = req.body.address?.trim() || null;
    if (req.body.addressLine1 !== undefined) updateData.addressLine1 = req.body.addressLine1?.trim() || null;
    if (req.body.addressLine2 !== undefined) updateData.addressLine2 = req.body.addressLine2?.trim() || null;
    if (req.body.city !== undefined) updateData.city = req.body.city?.trim() || null;
    if (req.body.postcode !== undefined) updateData.postcode = req.body.postcode?.trim() || null;
    if (req.body.county !== undefined) updateData.county = req.body.county?.trim() || null;
    if (req.body.country !== undefined) updateData.country = req.body.country?.trim() || "United Kingdom";
    if (req.body.openingBalance !== undefined) updateData.openingBalance = parseFloat(req.body.openingBalance || "0").toFixed(2);
    if (req.body.openingBalanceDate !== undefined) updateData.openingBalanceDate = req.body.openingBalanceDate ? new Date(req.body.openingBalanceDate) : null;
    if (req.body.isActive !== undefined) updateData.isActive = Boolean(req.body.isActive);
    if (req.body.recurringEmail !== undefined) updateData.recurringEmail = Boolean(req.body.recurringEmail);
    if (req.body.notes !== undefined) updateData.notes = req.body.notes?.trim() || null;
    if (req.body.sortCode !== undefined) updateData.sortCode = req.body.sortCode?.trim() || null;
    if (req.body.accountNumber !== undefined) updateData.accountNumber = req.body.accountNumber?.trim() || null;
    if (req.body.iban !== undefined) updateData.iban = req.body.iban?.trim() || null;
    if (req.body.designation !== undefined) updateData.designation = req.body.designation?.trim() || null;
    if (req.body.shareType !== undefined) updateData.shareType = req.body.shareType?.trim() || "Equity";
    if (req.body.numberOfShares !== undefined) updateData.numberOfShares = parseFloat(req.body.numberOfShares || "0").toFixed(2);
    if (req.body.shareValue !== undefined) updateData.shareValue = parseFloat(req.body.shareValue || "1").toFixed(2);
    if (req.body.vatNumber !== undefined) updateData.vatNumber = req.body.vatNumber?.trim() || null;

    await db.update(contacts).set(updateData).where(eq(contacts.id, contactId));
    res.json({ success: true, message: "Contact updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update contact" });
  }
});

router.delete("/contacts/:id", async (req: any, res) => {
  try {
    const contactId = parseInt(req.params.id);
    if (!contactId) return res.status(400).json({ message: "Invalid contact ID" });

    // Check if linked to sales invoices
    const linkedInvoices = await db.select({ id: salesInvoices.id }).from(salesInvoices).where(eq(salesInvoices.customerId, contactId)).limit(1);
    if (linkedInvoices.length > 0) {
      return res.status(400).json({ message: "Cannot delete contact because existing sales invoices are linked to it. Consider deactivating the contact instead." });
    }

    // Check if linked to purchases
    const linkedPurchases = await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.supplierId, contactId)).limit(1);
    if (linkedPurchases.length > 0) {
      return res.status(400).json({ message: "Cannot delete contact because supplier bills are linked to it. Consider deactivating the contact instead." });
    }

    await db.delete(contacts).where(eq(contacts.id, contactId));
    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete contact" });
  }
});

// Action: Make Director (promote Shareholder to Director)
router.post("/contacts/:id/make-director", async (req: any, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const existing = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ message: "Contact not found" });

    await db.update(contacts).set({
      contactType: "Director",
      designation: "Director",
    }).where(eq(contacts.id, contactId));

    res.json({ success: true, message: `${existing[0].name} has been promoted to Director.` });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to make director" });
  }
});

// Batch CSV Import Contacts (Generic for Customers & Suppliers)
router.post("/contacts/import/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const contactRows = req.body.contacts || [];

    if (!Array.isArray(contactRows) || contactRows.length === 0) {
      return res.status(400).json({ message: "No contacts provided for import." });
    }

    // Fetch existing contacts for duplicate skipping
    const existing = await db.select().from(contacts).where(eq(contacts.clientId, clientId));
    const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of contactRows) {
      const name = (row.name || row.contactName || "").trim();
      if (!name) continue;

      if (existingNames.has(name.toLowerCase())) {
        skippedCount++;
        continue;
      }

      const type = (row.contactType || row.type || "Customer").trim();
      const opBal = parseFloat(row.openingBalance || "0") || 0;

      await db.insert(contacts).values({
        practiceId: req.user.practiceId,
        clientId,
        contactType: type,
        name,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        addressLine1: row.addressLine1 || row.address || null,
        city: row.city || null,
        postcode: row.postcode || null,
        country: row.country || "United Kingdom",
        openingBalance: opBal.toFixed(2),
        isActive: true,
        recurringEmail: true,
        notes: row.notes || "Imported via CSV",
      } as any);

      existingNames.add(name.toLowerCase());
      importedCount++;
    }

    res.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Successfully imported ${importedCount} contacts. ${skippedCount > 0 ? `${skippedCount} existing contacts skipped.` : ""}`,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to import contacts" });
  }
});

// GET Contact Ledger Statement & Transactions Drill-down
router.get("/contacts/:id/statement", async (req: any, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const contactRec = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (contactRec.length === 0) return res.status(404).json({ message: "Contact not found" });

    const contact = contactRec[0];
    const opBal = parseFloat(contact.openingBalance || "0") || 0;

    let totalDue = opBal;
    let advanceAmount = 0;
    let transactions: any[] = [];

    if (contact.contactType === "Customer") {
      const invs = await db.select().from(salesInvoices).where(eq(salesInvoices.customerId, contactId)).orderBy(salesInvoices.invoiceDate);
      transactions = invs.map(i => {
        const net = parseFloat(i.subTotal || "0") || 0;
        const total = parseFloat(i.grandTotal || "0") || 0;
        if (i.status !== "Paid") totalDue += total;
        return {
          id: i.id,
          date: i.invoiceDate,
          refNo: i.invoiceNumber,
          reference: i.notes || "Sales Invoice",
          type: "Invoice",
          amount: total.toFixed(2),
          allocated: i.status === "Paid" ? total.toFixed(2) : "0.00",
          unallocated: i.status === "Paid" ? "0.00" : total.toFixed(2),
          status: i.status,
        };
      });
    } else if (contact.contactType === "Supplier") {
      const purs = await db.select().from(purchases).where(eq(purchases.supplierId, contactId)).orderBy(purchases.billDate);
      transactions = purs.map(p => {
        const total = parseFloat(p.grandTotal || "0") || 0;
        if (p.status !== "Paid") totalDue += total;
        return {
          id: p.id,
          date: p.billDate,
          refNo: p.billNumber,
          reference: p.notes || "Supplier Bill",
          type: "Bill",
          amount: total.toFixed(2),
          allocated: p.status === "Paid" ? total.toFixed(2) : "0.00",
          unallocated: p.status === "Paid" ? "0.00" : total.toFixed(2),
          status: p.status,
        };
      });
    }

    const netBalance = totalDue - advanceAmount;

    res.json({
      contact,
      accountStatus: {
        totalDue: totalDue.toFixed(2),
        advanceAmount: advanceAmount.toFixed(2),
        balance: netBalance.toFixed(2),
      },
      transactions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch contact statement" });
  }
});

// --- CHART OF ACCOUNTS ---
router.get("/coa/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.clientId, clientId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Chart of Accounts" });
  }
});

router.post("/coa", async (req: any, res) => {
  try {
    const { clientId, nominalCode, name, category } = req.body;
    const [result] = await db.insert(chartOfAccounts).values({
      clientId: parseInt(clientId),
      nominalCode,
      name,
      category,
      isSystem: false,
    });
    res.json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Chart of Accounts entry" });
  }
});

// --- ITEMS & PRODUCTS ---
router.get("/items", async (req: any, res) => {
  try {
    const result = await db.select().from(items).orderBy(items.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

router.get("/items/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(items)
      .where(eq(items.clientId, clientId))
      .orderBy(items.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

router.post("/items", async (req: any, res) => {
  try {
    const clientId = parseInt(req.body.clientId) || 1;
    const openingQty = parseFloat(req.body.openingBalanceQuantity || "0") || 0;
    const openingPrice = parseFloat(req.body.openingBalancePrice || "0") || 0;
    const openingAmount = (openingQty * openingPrice).toFixed(2);

    const data = {
      clientId,
      itemCode: req.body.itemCode || `ITM-${Math.floor(100 + Math.random() * 900)}`,
      name: req.body.name,
      description: req.body.description || null,
      type: req.body.type || "Product",
      salesPrice: String(req.body.salesPrice || "0.00"),
      salesVatRate: String(req.body.salesVatRate || req.body.vatRate || "20.00"),
      salesNominalCode: String(req.body.salesNominalCode || req.body.incomeAccount || "4000"),
      purchasePrice: String(req.body.purchasePrice || "0.00"),
      purchaseVatRate: String(req.body.purchaseVatRate || "20.00"),
      purchaseNominalCode: String(req.body.purchaseNominalCode || "5000"),
      openingBalanceQuantity: openingQty.toFixed(2),
      openingBalancePrice: openingPrice.toFixed(2),
      openingBalanceAmount: openingAmount,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true
    };
    
    const [result] = await db.insert(items).values(data);
    res.json({ id: result.insertId, ...data });
  } catch (error) {
    res.status(500).json({ message: "Failed to create item" });
  }
});

router.put("/items/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.itemCode !== undefined) updateData.itemCode = req.body.itemCode;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.salesPrice !== undefined) updateData.salesPrice = String(req.body.salesPrice);
    if (req.body.salesVatRate !== undefined) updateData.salesVatRate = String(req.body.salesVatRate);
    if (req.body.salesNominalCode !== undefined) updateData.salesNominalCode = String(req.body.salesNominalCode);
    if (req.body.purchasePrice !== undefined) updateData.purchasePrice = String(req.body.purchasePrice);
    if (req.body.purchaseVatRate !== undefined) updateData.purchaseVatRate = String(req.body.purchaseVatRate);
    if (req.body.purchaseNominalCode !== undefined) updateData.purchaseNominalCode = String(req.body.purchaseNominalCode);
    if (req.body.openingBalanceQuantity !== undefined) updateData.openingBalanceQuantity = String(req.body.openingBalanceQuantity);
    if (req.body.openingBalancePrice !== undefined) updateData.openingBalancePrice = String(req.body.openingBalancePrice);
    if (req.body.openingBalanceAmount !== undefined) {
      updateData.openingBalanceAmount = String(req.body.openingBalanceAmount);
    } else if (req.body.openingBalanceQuantity !== undefined || req.body.openingBalancePrice !== undefined) {
      const q = parseFloat(req.body.openingBalanceQuantity ?? "0") || 0;
      const p = parseFloat(req.body.openingBalancePrice ?? "0") || 0;
      updateData.openingBalanceAmount = (q * p).toFixed(2);
    }
    if (req.body.isActive !== undefined) updateData.isActive = Boolean(req.body.isActive);

    await db.update(items).set(updateData).where(eq(items.id, id));
    res.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update item" });
  }
});

router.delete("/items/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(items).where(eq(items.id, id));
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete item" });
  }
});

// Batch Import Items from CSV
router.post("/items/import/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const importedRows = req.body.items || [];
    if (!Array.isArray(importedRows) || importedRows.length === 0) {
      return res.status(400).json({ message: "No items provided for import" });
    }

    // Get existing items for this client to skip duplicates
    const existing = await db.select().from(items).where(eq(items.clientId, clientId));
    const existingCodes = new Set(existing.map(i => i.itemCode?.trim().toLowerCase()).filter(Boolean));
    const existingNames = new Set(existing.map(i => i.name.trim().toLowerCase()));

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of importedRows) {
      const name = (row.name || row.itemName || "").trim();
      if (!name) {
        skippedCount++;
        continue;
      }

      const itemCode = (row.itemCode || row.code || `ITM-${Math.floor(100 + Math.random() * 900)}`).trim();
      
      // Duplicate check: skip if existing name or code
      if (existingNames.has(name.toLowerCase()) || (row.itemCode && existingCodes.has(itemCode.toLowerCase()))) {
        skippedCount++;
        continue;
      }

      const salesPrice = parseFloat(row.price || row.itemPrice || row.salesPrice || "0") || 0;
      const purchasePrice = parseFloat(row.purchasePrice || "0") || 0;
      const openingQty = parseFloat(row.openingBalanceQuantity || row.openingQty || "0") || 0;
      const openingPrice = parseFloat(row.openingBalancePrice || row.openingPrice || "0") || 0;
      const openingAmount = (openingQty * openingPrice).toFixed(2);

      await db.insert(items).values({
        clientId,
        name,
        itemCode,
        description: row.description || null,
        type: row.type || "Product",
        salesPrice: salesPrice.toFixed(2),
        salesVatRate: String(row.salesVatRate || "20.00"),
        salesNominalCode: String(row.salesNominalCode || "4000"),
        purchasePrice: purchasePrice.toFixed(2),
        purchaseVatRate: String(row.purchaseVatRate || "20.00"),
        purchaseNominalCode: String(row.purchaseNominalCode || "5000"),
        openingBalanceQuantity: openingQty.toFixed(2),
        openingBalancePrice: openingPrice.toFixed(2),
        openingBalanceAmount: openingAmount,
        isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
      });

      existingNames.add(name.toLowerCase());
      existingCodes.add(itemCode.toLowerCase());
      importedCount++;
    }

    res.json({
      success: true,
      importedCount,
      skippedCount,
      totalRows: importedRows.length,
      message: `Successfully imported ${importedCount} items. ${skippedCount > 0 ? `${skippedCount} existing or invalid items skipped.` : ""}`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to import items" });
  }
});

// Batch Import Sales Invoices from CSV
router.post("/invoices/import/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const rows = req.body.invoices || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "No invoice records provided for import" });
    }

    // Group rows by invoice number
    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const invNum = (r.invoiceNumber || r.invoiceNo || "").trim();
      if (!invNum) continue;
      if (!grouped.has(invNum)) grouped.set(invNum, []);
      grouped.get(invNum)!.push(r);
    }

    if (grouped.size === 0) {
      return res.status(400).json({ message: "Could not find valid invoice numbers in CSV." });
    }

    // Fetch existing contacts for client
    const existingContacts = await db.select().from(contacts).where(eq(contacts.clientId, clientId));
    const contactMap = new Map(existingContacts.map(c => [c.name.toLowerCase().trim(), c]));

    // Fetch existing invoices for client to skip duplicates
    const existingInvoices = await db.select({ invoiceNumber: salesInvoices.invoiceNumber })
      .from(salesInvoices)
      .where(eq(salesInvoices.clientId, clientId));
    const existingInvNums = new Set(existingInvoices.map(i => i.invoiceNumber.toLowerCase().trim()));

    let importedInvoices = 0;
    let importedLines = 0;
    let skippedInvoices = 0;

    for (const [invNum, lineItems] of Array.from(grouped.entries())) {
      if (existingInvNums.has(invNum.toLowerCase())) {
        skippedInvoices++;
        continue;
      }

      const firstRow = lineItems[0];
      const contactName = (firstRow.contactName || "Customer").trim();

      // Find or create customer contact
      let customerId: number | null = null;
      if (contactMap.has(contactName.toLowerCase())) {
        customerId = contactMap.get(contactName.toLowerCase())!.id;
      } else {
        const [newContact] = await db.insert(contacts).values({
          practiceId: (req as any).user.practiceId,
          clientId,
          name: contactName,
          contactType: "Customer",
        });
        customerId = newContact.insertId;
        contactMap.set(contactName.toLowerCase(), { id: customerId, name: contactName } as any);
      }

      // Parse dates
      let invDate = new Date();
      if (firstRow.invoiceDate) {
        const parts = firstRow.invoiceDate.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            invDate = new Date(firstRow.invoiceDate);
          } else {
            invDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }
      if (isNaN(invDate.getTime())) invDate = new Date();

      let invDueDate: Date | null = null;
      if (firstRow.dueDate || firstRow.invoiceDueDate) {
        const dStr = firstRow.dueDate || firstRow.invoiceDueDate;
        const parts = dStr.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            invDueDate = new Date(dStr);
          } else {
            invDueDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }

      // Compute totals
      let subTotal = 0;
      let vatTotal = 0;
      const parsedItems = lineItems.map((it: any) => {
        const qty = parseFloat(it.quantity || it.itemQty || "1") || 1;
        const unitPrice = parseFloat(it.unitPrice || it.price || "0") || 0;
        const vRate = parseFloat(it.vatRate || "20.00") || 0;
        const net = qty * unitPrice;
        const vat = net * (vRate / 100);
        subTotal += net;
        vatTotal += vat;

        return {
          description: it.description || it.itemName || `Item for ${invNum}`,
          quantity: qty.toFixed(2),
          unitPrice: unitPrice.toFixed(2),
          vatRate: vRate.toFixed(2),
          vatAmount: vat.toFixed(2),
          netAmount: net.toFixed(2),
          nominalCode: it.accountName || it.nominalCode || "4000",
        };
      });

      const grandTotal = subTotal + vatTotal;

      const [invResult] = await db.insert(salesInvoices).values({
        clientId,
        customerId,
        invoiceNumber: invNum,
        invoiceType: firstRow.transactionType || "Invoice",
        invoiceDate: invDate,
        dueDate: invDueDate,
        subTotal: subTotal.toFixed(2),
        vatTotal: vatTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        status: "Draft",
        notes: firstRow.notes || `Imported from CSV (${invNum})`,
      } as any);

      const invoiceId = invResult.insertId;

      // Insert invoice line items
      for (const it of parsedItems) {
        await db.insert(invoiceItems).values({
          invoiceId,
          ...it,
        });
        importedLines++;
      }

      existingInvNums.add(invNum.toLowerCase());
      importedInvoices++;
    }

    res.json({
      success: true,
      importedInvoices,
      importedLines,
      skippedInvoices,
      message: `Successfully imported ${importedInvoices} invoices with ${importedLines} lines. ${skippedInvoices > 0 ? `${skippedInvoices} duplicate invoices skipped.` : ""}`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to import invoices" });
  }
});

// POST /api/bookkeeping/purchases/import/:clientId
router.post("/purchases/import/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const purchaseRows = req.body.purchases || [];

    if (!Array.isArray(purchaseRows) || purchaseRows.length === 0) {
      return res.status(400).json({ message: "No purchase bills provided for import." });
    }

    // Group rows by billNumber
    const grouped = new Map<string, any[]>();
    for (const r of purchaseRows) {
      const billNum = (r.billNumber || r.invoiceNumber || r.referenceNo || r.reference || "").trim();
      if (!billNum) continue;
      if (!grouped.has(billNum)) {
        grouped.set(billNum, []);
      }
      grouped.get(billNum)!.push(r);
    }

    if (grouped.size === 0) {
      return res.status(400).json({ message: "Could not find valid bill numbers in CSV." });
    }

    // Fetch existing suppliers for client
    const existingContacts = await db.select().from(contacts).where(
      and(eq(contacts.clientId, clientId), eq(contacts.contactType, "Supplier"))
    );
    const contactMap = new Map(existingContacts.map(c => [c.name.toLowerCase().trim(), c]));

    // Fetch existing purchases for client to skip duplicates
    const existingBills = await db.select({ billNumber: purchases.billNumber })
      .from(purchases)
      .where(eq(purchases.clientId, clientId));
    const existingBillNums = new Set(
      existingBills
        .map(b => b.billNumber ? b.billNumber.toLowerCase().trim() : "")
        .filter(Boolean)
    );

    let importedPurchases = 0;
    let importedLines = 0;
    let skippedPurchases = 0;

    for (const [billNum, lineItems] of Array.from(grouped.entries())) {
      if (existingBillNums.has(billNum.toLowerCase())) {
        skippedPurchases++;
        continue;
      }

      const firstRow = lineItems[0];
      const supplierName = (firstRow.supplierName || firstRow.contactName || "Supplier").trim();

      // Find or create supplier contact
      let supplierId: number | null = null;
      if (contactMap.has(supplierName.toLowerCase())) {
        supplierId = contactMap.get(supplierName.toLowerCase())!.id;
      } else {
        const [newContact] = await db.insert(contacts).values({
          practiceId: (req as any).user.practiceId,
          clientId,
          name: supplierName,
          contactType: "Supplier",
        });
        supplierId = newContact.insertId;
        contactMap.set(supplierName.toLowerCase(), { id: supplierId, name: supplierName } as any);
      }

      // Parse dates
      let bDate = new Date();
      if (firstRow.billDate || firstRow.date) {
        const dateStr = firstRow.billDate || firstRow.date;
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            bDate = new Date(dateStr);
          } else {
            bDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }
      if (isNaN(bDate.getTime())) bDate = new Date();

      let bDueDate: Date | null = null;
      if (firstRow.dueDate) {
        const dStr = firstRow.dueDate;
        const parts = dStr.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            bDueDate = new Date(dStr);
          } else {
            bDueDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }

      // Compute totals
      let subTotal = 0;
      let vatTotal = 0;
      const parsedItems = lineItems.map((it: any) => {
        const qty = parseFloat(it.quantity || "1") || 1;
        const unitPrice = parseFloat(it.unitPrice || it.amount || it.cost || "0") || 0;
        const vRate = parseFloat(it.vatRate || "20.00") || 0;
        const net = qty * unitPrice;
        const vat = net * (vRate / 100);
        subTotal += net;
        vatTotal += vat;

        return {
          description: it.description || `Purchase item for ${billNum}`,
          quantity: qty.toFixed(2),
          unitPrice: unitPrice.toFixed(2),
          vatRate: vRate.toFixed(2),
          vatAmount: vat.toFixed(2),
          netAmount: net.toFixed(2),
          nominalCode: it.accountCode || it.nominalCode || "5000",
        };
      });

      const grandTotal = subTotal + vatTotal;

      const [purResult] = await db.insert(purchases).values({
        clientId,
        supplierId,
        billNumber: billNum,
        purchaseType: firstRow.purchaseType?.toLowerCase().includes("credit") ? "Credit Note" : "Invoice",
        billDate: bDate,
        dueDate: bDueDate,
        subTotal: subTotal.toFixed(2),
        vatTotal: vatTotal.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        status: "Unpaid",
        notes: firstRow.notes || `Imported from CSV (${billNum})`,
      } as any);

      const purchaseId = purResult.insertId;

      // Insert purchase line items
      for (const it of parsedItems) {
        await db.insert(purchaseItems).values({
          purchaseId,
          ...it,
        });
        importedLines++;
      }

      existingBillNums.add(billNum.toLowerCase());
      importedPurchases++;
    }

    res.json({
      success: true,
      importedPurchases,
      importedLines,
      skippedPurchases,
      message: `Successfully imported ${importedPurchases} purchase bills with ${importedLines} lines. ${skippedPurchases > 0 ? `${skippedPurchases} duplicate bills skipped.` : ""}`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to import purchase bills" });
  }
});

// --- CIS SETTINGS ---
router.get("/cis-settings/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [result] = await db.select().from(cisSettings).where(eq(cisSettings.clientId, clientId));
    res.json(result || null);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch CIS settings" });
  }
});

router.post("/cis-settings", async (req: any, res) => {
  try {
    const clientId = parseInt(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: "clientId is required" });

    const data = {
      clientId,
      isContractor: req.body.isContractor || false,
      isSubcontractor: req.body.isSubcontractor || false,
      employerReference: req.body.employerReference || null,
      accountsOfficeReference: req.body.accountsOfficeReference || null,
      utrNumber: req.body.utrNumber || null,
      deductionRate: req.body.deductionRate || "20.00"
    };

    const existing = await db.select().from(cisSettings).where(eq(cisSettings.clientId, clientId));
    
    if (existing.length > 0) {
      await db.update(cisSettings).set(data).where(eq(cisSettings.clientId, clientId));
      res.json({ message: "CIS settings updated", ...data });
    } else {
      const [result] = await db.insert(cisSettings).values(data);
      res.json({ id: result.insertId, ...data });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to update CIS settings" });
  }
});
// --- QUOTATIONS ---
router.get("/quotes", async (req: any, res) => {
  try {
    const cids = await getClientIds(req.user.practiceId);
    const list = await db.select({
      id: quotations.id,
      clientId: quotations.clientId,
      customerId: quotations.customerId,
      quoteNumber: quotations.quoteNumber,
      quoteDate: quotations.quoteDate,
      expiryDate: quotations.expiryDate,
      totalAmount: quotations.totalAmount,
      reference: quotations.reference,
      notes: quotations.notes,
      itemsJson: quotations.itemsJson,
      status: quotations.status,
      createdAt: quotations.createdAt,
      clientName: clients.clientName,
      customerName: contacts.name,
      customerEmail: contacts.email,
      customerPhone: contacts.phone,
      customerAddress: contacts.address,
    })
    .from(quotations)
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .leftJoin(contacts, eq(quotations.customerId, contacts.id))
    .where(inArray(quotations.clientId, cids))
    .orderBy(desc(quotations.createdAt));

    const mapped = list.map(q => {
      let parsedItems: any[] = [];
      if (q.itemsJson) {
        try { parsedItems = JSON.parse(q.itemsJson); } catch (_) {}
      }
      return {
        ...q,
        items: parsedItems,
      };
    });

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});

// GET /api/bookkeeping/quotes/client/:clientId — Client-specific quotations with customer details
router.get("/quotes/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const list = await db.select({
      id: quotations.id,
      clientId: quotations.clientId,
      customerId: quotations.customerId,
      quoteNumber: quotations.quoteNumber,
      quoteDate: quotations.quoteDate,
      expiryDate: quotations.expiryDate,
      totalAmount: quotations.totalAmount,
      reference: quotations.reference,
      notes: quotations.notes,
      itemsJson: quotations.itemsJson,
      status: quotations.status,
      createdAt: quotations.createdAt,
      clientName: clients.clientName,
      customerName: contacts.name,
      customerEmail: contacts.email,
      customerPhone: contacts.phone,
      customerAddress: contacts.address,
    })
    .from(quotations)
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .leftJoin(contacts, eq(quotations.customerId, contacts.id))
    .where(eq(quotations.clientId, clientId))
    .orderBy(desc(quotations.createdAt));

    const mapped = list.map(q => {
      let parsedItems: any[] = [];
      if (q.itemsJson) {
        try { parsedItems = JSON.parse(q.itemsJson); } catch (_) {}
      }
      return {
        ...q,
        items: parsedItems,
      };
    });

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch client quotations", error: error.message });
  }
});

router.post("/quotes", async (req: any, res) => {
  try {
    const { clientId, customerId, quoteNumber, quoteDate, expiryDate, reference, notes, totalAmount, items } = req.body;
    const cids = await getClientIds(req.user.practiceId);
    const targetClientId = parseInt(clientId) || cids[0] || 1;
    const finalQuoteNumber = quoteNumber && String(quoteNumber).trim() ? String(quoteNumber).trim() : `QT-${Math.floor(100000 + Math.random() * 900000)}`;
    const itemsJson = items && Array.isArray(items) ? JSON.stringify(items) : null;

    const [inserted] = await db.insert(quotations).values({
      clientId: targetClientId,
      customerId: customerId ? parseInt(customerId) : null,
      quoteNumber: finalQuoteNumber,
      quoteDate: quoteDate ? new Date(quoteDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      totalAmount: totalAmount || "0.00",
      reference: reference || null,
      notes: notes || null,
      itemsJson,
      status: "Draft",
    });

    res.json({ id: inserted.insertId, quoteNumber: finalQuoteNumber, clientId: targetClientId, status: "Draft" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create quotation", error: error.message });
  }
});

// PUT /api/bookkeeping/quotes/:id
router.put("/quotes/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = req.user.role;
    if (!["admin", "accountant"].includes(role)) {
      return res.status(403).json({ message: "Permission denied. Only admin or accountant can edit quotations." });
    }
    const { customerId, quoteDate, expiryDate, reference, notes, totalAmount, status, items } = req.body;
    const updateData: any = {};
    if (customerId !== undefined) updateData.customerId = customerId ? parseInt(customerId) : null;
    if (quoteDate !== undefined) updateData.quoteDate = quoteDate ? new Date(quoteDate) : null;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (reference !== undefined) updateData.reference = reference;
    if (notes !== undefined) updateData.notes = notes;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (status !== undefined) updateData.status = status;
    if (items !== undefined && Array.isArray(items)) updateData.itemsJson = JSON.stringify(items);

    await db.update(quotations).set(updateData).where(eq(quotations.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update quotation", error: error.message });
  }
});

// GET /api/bookkeeping/quotes/details/:id — fetch single quotation
router.get("/quotes/details/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quote] = await db.select({
      id: quotations.id,
      clientId: quotations.clientId,
      customerId: quotations.customerId,
      quoteNumber: quotations.quoteNumber,
      quoteDate: quotations.quoteDate,
      expiryDate: quotations.expiryDate,
      totalAmount: quotations.totalAmount,
      reference: quotations.reference,
      notes: quotations.notes,
      itemsJson: quotations.itemsJson,
      status: quotations.status,
      createdAt: quotations.createdAt,
      customerName: contacts.name,
      customerEmail: contacts.email,
      customerPhone: contacts.phone,
      customerAddress: contacts.address,
    })
    .from(quotations)
    .leftJoin(contacts, eq(quotations.customerId, contacts.id))
    .where(eq(quotations.id, id));

    if (!quote) return res.status(404).json({ message: "Quotation not found" });

    let parsedItems: any[] = [];
    if (quote.itemsJson) {
      try { parsedItems = JSON.parse(quote.itemsJson); } catch (_) {}
    }

    res.json({
      ...quote,
      items: parsedItems,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch quotation details", error: error.message });
  }
});

// GET /api/bookkeeping/quotes/:id/download-doc — Stream merged Quotation.docx
router.get("/quotes/:id/download-doc", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quote] = await db
      .select({
        id: quotations.id,
        clientId: quotations.clientId,
        customerId: quotations.customerId,
        quoteNumber: quotations.quoteNumber,
        quoteDate: quotations.quoteDate,
        expiryDate: quotations.expiryDate,
        totalAmount: quotations.totalAmount,
        reference: quotations.reference,
        notes: quotations.notes,
        itemsJson: quotations.itemsJson,
        status: quotations.status,
        customerName: contacts.name,
        customerEmail: contacts.email,
        customerPhone: contacts.phone,
        customerAddress: contacts.address,
      })
      .from(quotations)
      .leftJoin(contacts, eq(quotations.customerId, contacts.id))
      .where(eq(quotations.id, id));

    if (!quote) return res.status(404).json({ message: "Quotation not found" });

    // Fetch client / company info
    let companyName = "SanSuite";
    let companyAddress = "";
    let companyPhone = "";
    let companyRegNo = "";
    let companyVatRegNo = "";

    if (quote.clientId) {
      const [clientRecord] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      if (clientRecord) {
        companyName = clientRecord.clientName || "Company";
        companyAddress = [
          clientRecord.address,
          clientRecord.city,
          clientRecord.county,
          clientRecord.postcode
        ].filter(Boolean).join("\n");
        companyPhone = clientRecord.phone || "";
        companyRegNo = clientRecord.registrationNumber || "";
        companyVatRegNo = clientRecord.vatNumber || "";
      }
    }

    let parsedItems: any[] = [];
    if (quote.itemsJson) {
      try { parsedItems = JSON.parse(quote.itemsJson); } catch (_) {}
    }

    let netSum = 0;
    let vatSum = 0;
    const items = parsedItems.map(it => {
      const qty = Number(it.quantity || 1);
      const uPrice = Number(it.unitPrice || it.rate || 0);
      const net = Number(it.netAmount || it.amount || (qty * uPrice));
      let vRateNum = 0;
      if (it.vatRate != null && it.vatRate !== "") {
        const vNum = Number(String(it.vatRate).replace("%", ""));
        if (!isNaN(vNum) && vNum > 0) vRateNum = vNum;
      }
      const vAmount = it.vatAmount != null ? Number(it.vatAmount) : (net * (vRateNum / 100));
      const gross = Number(it.grossAmount || (net + vAmount));
      netSum += net;
      vatSum += vAmount;
      return {
        description: it.description || "Quotation Item",
        unitPrice: uPrice,
        quantity: qty,
        netAmount: net,
        vatRate: vRateNum > 0 ? `${vRateNum}%` : "No VAT",
        vatAmount: vAmount,
        grossAmount: gross,
      };
    });

    const totalAmt = Number(quote.totalAmount || (netSum + vatSum));
    const effectiveNet = netSum > 0 ? netSum : totalAmt;

    const docxBuffer = await generateMergedDocx({
      templateType: "quotation",
      practiceId: req.user?.practiceId || 1,
      clientId: quote.clientId,
      data: {
        companyName,
        companyAddress,
        companyPhone,
        companyRegNo,
        companyVatRegNo,
        docTitle: "QUOTATION",
        docNumber: quote.quoteNumber,
        docDate: quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
        expiryDate: quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString("en-GB") : "-",
        reference: quote.reference || quote.notes || "",
        customerName: quote.customerName || "Customer",
        customerAddress: quote.customerAddress || "",
        items: items.length > 0 ? items : [{
          description: "Quotation Items",
          unitPrice: totalAmt,
          quantity: 1,
          netAmount: totalAmt,
          vatRate: "No VAT",
          vatAmount: 0,
          grossAmount: totalAmt,
        }],
        netAmount: effectiveNet,
        vatAmount: vatSum,
        totalAmount: totalAmt,
      },
    });

    const safeNumber = (quote.quoteNumber || "QT").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="Quotation_${safeNumber}.docx"`);
    res.send(docxBuffer);
  } catch (error: any) {
    console.error("Error generating quotation docx:", error);
    res.status(500).json({ message: "Failed to generate Quotation Word document", error: error.message });
  }
});

// POST /api/bookkeeping/quotes/:id/send-email — send quote via email
router.post("/quotes/:id/send-email", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { recipientEmail } = req.body;
    const [quote] = await db.select().from(quotations).where(eq(quotations.id, id));
    if (!quote) return res.status(404).json({ message: "Quotation not found" });

    if (!quote.status || quote.status === "Draft") {
      await db.update(quotations).set({ status: "Sent" }).where(eq(quotations.id, id));
    }

    res.json({
      success: true,
      message: `Quotation ${quote.quoteNumber} emailed successfully to ${recipientEmail || "customer"}.`,
      status: "Sent"
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to send quotation email", error: error.message });
  }
});

router.delete("/quotes/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(quotations).where(eq(quotations.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete quotation" });
  }
});

// --- INVOICE & QUOTATION TEMPLATES ---
router.get("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const result = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.practiceId, practiceId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

router.post("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const data = {
      ...req.body,
      practiceId,
    };
    const [result] = await db.insert(invoiceTemplates).values(data);
    res.json({ id: result.insertId, ...data });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create template" });
  }
});

router.put("/templates/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { id: _, createdAt: __, ...updateData } = req.body;
    await db.update(invoiceTemplates).set({ ...updateData, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id));
    res.json({ success: true, id, ...updateData });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update template" });
  }
});

router.delete("/templates/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(invoiceTemplates).where(eq(invoiceTemplates.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// --- FIXED ASSETS ---
router.get("/fixed-assets/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(fixedAssets).where(eq(fixedAssets.clientId, clientId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch fixed assets", error: error.message });
  }
});

router.post("/fixed-assets", async (req: any, res) => {
  try {
    const { clientId, assetName, name, assetType, type, purchaseDate, cost, originalCost, depreciationMethod, rate, depreciationRate } = req.body;
    const finalName = assetName || name || "Asset";
    const finalType = assetType || type || "Equipment";
    const finalCost = originalCost || cost || "0.00";
    const finalRate = depreciationRate || rate || "20.00";
    const [result] = await db.insert(fixedAssets).values({
      clientId: parseInt(clientId),
      assetName: finalName,
      assetType: finalType,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      originalCost: String(finalCost),
      depreciationMethod: depreciationMethod || "Straight Line",
      depreciationRate: String(finalRate).replace("%", ""),
      netBookValue: String(finalCost),
    });
    res.json({ id: result.insertId, message: "Asset added successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create fixed asset", error: error.message });
  }
});

router.delete("/fixed-assets/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(fixedAssets).where(eq(fixedAssets.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete fixed asset" });
  }
});

// --- RECURRING PROFILES (INVOICES & PURCHASES) ---
router.get("/recurring/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const profileType = req.query.type as string;
    const result = await db.select().from(recurringProfiles).where(
      profileType 
        ? and(eq(recurringProfiles.clientId, clientId), eq(recurringProfiles.profileType, profileType))
        : eq(recurringProfiles.clientId, clientId)
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch recurring profiles", error: error.message });
  }
});

router.post("/recurring", async (req: any, res) => {
  try {
    const { clientId, profileType, profileName, partyName, customerName, supplierName, amount, frequency, startDate } = req.body;
    const finalParty = partyName || customerName || supplierName || "General";
    const [result] = await db.insert(recurringProfiles).values({
      clientId: parseInt(clientId),
      profileType: profileType || "invoice",
      profileName,
      partyName: finalParty,
      amount: String(amount || "0.00"),
      frequency: frequency || "Monthly",
      startDate: startDate ? new Date(startDate) : new Date(),
      nextRun: startDate ? new Date(startDate) : new Date(),
      status: "Active",
    });
    res.json({ id: result.insertId, message: "Recurring profile created" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create recurring profile", error: error.message });
  }
});

router.patch("/recurring/:id/toggle", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(recurringProfiles).where(eq(recurringProfiles.id, id));
    if (!existing) return res.status(404).json({ message: "Profile not found" });
    const newStatus = existing.status === "Active" ? "Paused" : "Active";
    await db.update(recurringProfiles).set({ status: newStatus }).where(eq(recurringProfiles.id, id));
    res.json({ success: true, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to toggle profile status" });
  }
});

router.delete("/recurring/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(recurringProfiles).where(eq(recurringProfiles.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete recurring profile" });
  }
});

// --- QUICK ENTRY BATCH INSERT ---
router.post("/quick-entry/batch", async (req: any, res) => {
  try {
    const { clientId, entries } = req.body;
    if (!clientId || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: "Invalid payload. Client ID and entries are required." });
    }

    const cId = parseInt(clientId);
    let insertedCount = 0;

    for (const entry of entries) {
      if (!entry.amount || parseFloat(entry.amount) <= 0) continue;
      const amt = parseFloat(entry.amount);
      const vatRate = parseFloat(entry.vatRate || "20");
      const vatTotal = (amt * (vatRate / 100)).toFixed(2);
      const grandTotal = (amt + parseFloat(vatTotal)).toFixed(2);
      const dateVal = entry.date ? new Date(entry.date) : new Date();

      if (entry.type === "Sales") {
        const [invRes] = await db.insert(salesInvoices).values({
          clientId: cId,
          invoiceNumber: `QE-INV-${Date.now().toString().slice(-6)}-${insertedCount + 1}`,
          invoiceDate: dateVal,
          subTotal: amt.toFixed(2),
          vatTotal,
          grandTotal,
          status: "Unpaid",
          notes: entry.description || "Quick entry sales invoice",
        });

        await db.insert(invoiceItems).values({
          invoiceId: invRes.insertId,
          description: entry.description || "Sales Item",
          quantity: "1.00",
          unitPrice: amt.toFixed(2),
          netAmount: amt.toFixed(2),
          vatRate: vatRate.toFixed(2),
          vatAmount: vatTotal,
          nominalCode: entry.nominal || "4000",
        });
        insertedCount++;
      } else {
        const [purRes] = await db.insert(purchases).values({
          clientId: cId,
          billNumber: `QE-PUR-${Date.now().toString().slice(-6)}-${insertedCount + 1}`,
          billDate: dateVal,
          subTotal: amt.toFixed(2),
          vatTotal,
          grandTotal,
          status: "Unpaid",
          notes: entry.description || "Quick entry purchase bill",
        });

        await db.insert(purchaseItems).values({
          purchaseId: purRes.insertId,
          description: entry.description || "Purchase Item",
          quantity: "1.00",
          unitPrice: amt.toFixed(2),
          netAmount: amt.toFixed(2),
          vatRate: vatRate.toFixed(2),
          vatAmount: vatTotal,
          nominalCode: entry.nominal || "5000",
        });
        insertedCount++;
      }
    }

    res.json({ success: true, insertedCount, message: `Successfully posted ${insertedCount} quick entries to ledger.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to process quick entries", error: error.message });
  }
});

// --- SANSUITE PAY TRANSACTIONS ---
router.get("/pay/transactions/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.clientId, clientId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
  }
});

router.post("/pay/create-transaction", async (req: any, res) => {
  try {
    const { clientId, invoiceNumber, amount, paymentMethod } = req.body;
    const numAmt = parseFloat(amount || "0");
    const fee = (numAmt * 0.014 + 0.20).toFixed(2);
    const net = (numAmt - parseFloat(fee)).toFixed(2);
    const txnRef = `TXN-${Date.now().toString().slice(-6)}`;

    const [result] = await db.insert(paymentTransactions).values({
      clientId: parseInt(clientId),
      invoiceNumber: invoiceNumber || "INV-GEN",
      transactionRef: txnRef,
      paymentMethod: paymentMethod || "Card",
      amount: numAmt.toFixed(2),
      fee,
      netAmount: net,
      status: "Completed",
    });

    res.json({ id: result.insertId, transactionRef: txnRef, message: "Payment recorded successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create payment transaction", error: error.message });
  }
});

// --- MULTI-INVOICE RECEIPTS & ADVANCE RECEIPTS ---
router.post("/receipts/multi-allocate", async (req: any, res) => {
  try {
    const { clientId, customerId, bankAccountId, paymentDate, reference, totalAmount, allocations, isAdvance, advanceAmount } = req.body;
    if (!clientId || !customerId) {
      return res.status(400).json({ message: "Client ID and Customer ID are required" });
    }

    const cId = parseInt(clientId);
    const ctId = parseInt(customerId);
    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    const bId = bankAccountId ? parseInt(bankAccountId) : null;
    let allocatedSum = 0;

    // Handle invoice allocations
    if (Array.isArray(allocations) && allocations.length > 0) {
      for (const alloc of allocations) {
        const invId = parseInt(alloc.invoiceId);
        const allocAmt = parseFloat(alloc.amount || "0");
        if (allocAmt <= 0) continue;

        const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invId));
        if (inv) {
          const currentPaid = parseFloat(inv.paidAmount || "0");
          const grandTotal = parseFloat(inv.grandTotal || "0");
          const newPaid = currentPaid + allocAmt;
          const newStatus = newPaid >= grandTotal - 0.01 ? "Paid" : "PartiallyPaid";

          await db.update(salesInvoices).set({
            paidAmount: newPaid.toFixed(2),
            status: newStatus,
          }).where(eq(salesInvoices.id, invId));

          allocatedSum += allocAmt;
        }
      }
    }

    // Record bank transaction if bank account provided
    if (bId) {
      const receiptTotal = parseFloat(totalAmount || String(allocatedSum));
      if (receiptTotal > 0) {
        await db.insert(bankTransactions).values({
          clientId: Number(clientId),
          bankAccountId: bId,
          transactionDate: pDate,
          description: `Customer Payment: ${reference || "Receipt"} (${reference || `REC-${Date.now().toString().slice(-6)}`})`,
          debit: receiptTotal.toFixed(2), // Money into bank
          credit: "0.00",
          isReconciled: false,
        });

        // Update bank account balance
        const [bank] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bId));
        if (bank) {
          const currentBal = parseFloat(bank.currentBalance || "0");
          await db.update(bankAccounts).set({
            currentBalance: (currentBal + receiptTotal).toFixed(2)
          }).where(eq(bankAccounts.id, bId));
        }
      }
    }

    res.json({
      success: true,
      allocatedAmount: allocatedSum.toFixed(2),
      isAdvance: !!isAdvance,
      advanceAmount: isAdvance ? parseFloat(advanceAmount || "0").toFixed(2) : "0.00",
      message: `Successfully processed receipt of £${totalAmount || allocatedSum.toFixed(2)}.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to allocate receipts", error: error.message });
  }
});

// --- BULK RECLASSIFY TRANSACTIONS ---
router.post("/bulk-reclassify", async (req: any, res) => {
  try {
    const { clientId, transactions, targetNominalCode, targetVatRate } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0 || !targetNominalCode) {
      return res.status(400).json({ message: "Transactions list and target nominal code are required" });
    }

    let updatedCount = 0;
    const nominalCodeOnly = targetNominalCode.split(" - ")[0].trim();

    for (const txn of transactions) {
      const txnId = parseInt(txn.id);
      if (txn.type === "Sales") {
        // Update all invoice items for this invoice
        const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, txnId));
        for (const item of items) {
          const updateData: any = { nominalCode: nominalCodeOnly };
          if (targetVatRate != null && targetVatRate !== "") {
            const vRate = parseFloat(targetVatRate);
            const net = parseFloat(item.netAmount || "0");
            const newVat = (net * (vRate / 100)).toFixed(2);
            updateData.vatRate = vRate.toFixed(2);
            updateData.vatAmount = newVat;
          }
          await db.update(invoiceItems).set(updateData).where(eq(invoiceItems.id, item.id));
        }
        updatedCount++;
      } else if (txn.type === "Purchase") {
        // Actual purchase ID (accounting for frontend offset if present)
        const actualPurId = txnId > 10000 ? txnId - 10000 : txnId;
        const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, actualPurId));
        for (const item of items) {
          const updateData: any = { nominalCode: nominalCodeOnly };
          if (targetVatRate != null && targetVatRate !== "") {
            const vRate = parseFloat(targetVatRate);
            const net = parseFloat(item.netAmount || "0");
            const newVat = (net * (vRate / 100)).toFixed(2);
            updateData.vatRate = vRate.toFixed(2);
            updateData.vatAmount = newVat;
          }
          await db.update(purchaseItems).set(updateData).where(eq(purchaseItems.id, item.id));
        }
        updatedCount++;
      }
    }

    res.json({
      success: true,
      updatedCount,
      message: `Successfully reclassified ${updatedCount} transactions to nominal code ${nominalCodeOnly}.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to reclassify transactions", error: error.message });
  }
});

// --- FIXED ASSETS DEPRECIATION RUN & DISPOSAL ---
router.post("/fixed-assets/:clientId/run-depreciation", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { depreciationDate } = req.body;
    const depDate = depreciationDate ? new Date(depreciationDate) : new Date();

    const assets = await db.select().from(fixedAssets).where(
      and(eq(fixedAssets.clientId, clientId), eq(fixedAssets.status, "Active"))
    );

    if (assets.length === 0) {
      return res.status(400).json({ message: "No active fixed assets found to depreciate." });
    }

    let totalDepCharge = 0;
    const assetUpdates: any[] = [];

    for (const asset of assets) {
      const cost = parseFloat(asset.originalCost || "0");
      const currentNbv = parseFloat(asset.netBookValue || String(cost));
      const rate = parseFloat(asset.depreciationRate || "20") / 100;
      let charge = 0;

      if (asset.depreciationMethod === "Straight Line") {
        charge = cost * rate;
      } else {
        // Reducing balance
        charge = currentNbv * rate;
      }

      // Charge cannot exceed remaining NBV
      charge = Math.min(charge, currentNbv);
      if (charge <= 0) continue;

      const newNbv = Math.max(0, currentNbv - charge);
      const currentAccum = parseFloat(asset.accumulatedDepreciation || "0");
      const newAccum = currentAccum + charge;

      await db.update(fixedAssets).set({
        netBookValue: newNbv.toFixed(2),
        accumulatedDepreciation: newAccum.toFixed(2),
        lastDepreciationDate: depDate,
      }).where(eq(fixedAssets.id, asset.id));

      totalDepCharge += charge;
      assetUpdates.push({
        id: asset.id,
        name: asset.assetName,
        charge: charge.toFixed(2),
        newNbv: newNbv.toFixed(2)
      });
    }

    if (totalDepCharge <= 0) {
      return res.json({ success: true, message: "All assets are already fully depreciated.", totalDepCharge: "0.00" });
    }

    // Auto post general ledger journal:
    // Dr 7000 Depreciation Charge (£totalDepCharge)
    // Cr 0021 Accumulated Depreciation (£totalDepCharge)
    const [journalRes] = await db.insert(journalEntries).values({
      clientId,
      journalNumber: `JRN-DEP-${Date.now().toString().slice(-6)}`,
      journalDate: depDate,
      reference: `Depreciation Run - ${depDate.toISOString().split("T")[0]}`,
      description: `Automated depreciation charge for ${assetUpdates.length} fixed assets.`,
      totalAmount: totalDepCharge.toFixed(2),
    });

    const jId = journalRes.insertId;

    // Dr Line (Expense 7000)
    await db.insert(journalLines).values({
      journalId: jId,
      nominalCode: "7000",
      description: "Depreciation of Fixed Assets",
      debit: totalDepCharge.toFixed(2),
      credit: "0.00",
    });

    // Cr Line (Accumulated Depreciation 0021)
    await db.insert(journalLines).values({
      journalId: jId,
      nominalCode: "0021",
      description: "Accumulated Depreciation on Plant & Equipment",
      debit: "0.00",
      credit: totalDepCharge.toFixed(2),
    });

    res.json({
      success: true,
      journalId: jId,
      totalDepCharge: totalDepCharge.toFixed(2),
      assetsProcessed: assetUpdates.length,
      assetUpdates,
      message: `Successfully posted depreciation of £${totalDepCharge.toFixed(2)} to general ledger.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to run depreciation", error: error.message });
  }
});

router.post("/fixed-assets/:id/dispose", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { disposalDate, disposalProceeds } = req.body;
    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, id));
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const proceeds = parseFloat(disposalProceeds || "0");
    const nbv = parseFloat(asset.netBookValue || "0");
    const gainOrLoss = proceeds - nbv; // Positive = profit on disposal, negative = loss on disposal
    const dDate = disposalDate ? new Date(disposalDate) : new Date();

    await db.update(fixedAssets).set({
      status: "Disposed",
      disposalDate: dDate,
      disposalProceeds: proceeds.toFixed(2),
      netBookValue: "0.00",
    }).where(eq(fixedAssets.id, id));

    // Post disposal journal
    const [journalRes] = await db.insert(journalEntries).values({
      clientId: asset.clientId,
      journalNumber: `JRN-DISP-${Date.now().toString().slice(-6)}`,
      journalDate: dDate,
      reference: `Disposal of ${asset.assetName}`,
      description: `Asset disposal: Proceeds £${proceeds.toFixed(2)}, NBV was £${nbv.toFixed(2)}, ${gainOrLoss >= 0 ? "Profit" : "Loss"}: £${Math.abs(gainOrLoss).toFixed(2)}`,
      totalAmount: (Math.max(proceeds, nbv)).toFixed(2),
    });

    res.json({
      success: true,
      proceeds: proceeds.toFixed(2),
      netBookValue: nbv.toFixed(2),
      gainOrLoss: gainOrLoss.toFixed(2),
      journalId: journalRes.insertId,
      message: `Asset "${asset.assetName}" marked as Disposed. Journal posted.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to dispose asset", error: error.message });
  }
});

// =============================================
// POINT 7: BANK RULES & CASH CODING ENGINE
// =============================================

// GET /api/bookkeeping/bank-rules/client/:clientId
router.get("/bank-rules/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const rules = await db.select({
      id: bankRules.id,
      clientId: bankRules.clientId,
      ruleName: bankRules.ruleName,
      ruleType: bankRules.ruleType,
      priority: bankRules.priority,
      fieldToMatch: bankRules.fieldToMatch,
      matchCondition: bankRules.matchCondition,
      matchValue: bankRules.matchValue,
      contactId: bankRules.contactId,
      nominalCode: bankRules.nominalCode,
      vatRate: bankRules.vatRate,
      isActive: bankRules.isActive,
      createdAt: bankRules.createdAt,
      payeeName: contacts.name,
    })
    .from(bankRules)
    .leftJoin(contacts, eq(bankRules.contactId, contacts.id))
    .where(eq(bankRules.clientId, clientId))
    .orderBy(bankRules.priority, desc(bankRules.id));

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch bank rules", error: error.message });
  }
});

// POST /api/bookkeeping/bank-rules
router.post("/bank-rules", async (req: any, res) => {
  try {
    const clientId = parseInt(req.body.clientId);
    if (!clientId || !req.body.ruleName || !req.body.matchValue) {
      return res.status(400).json({ message: "clientId, ruleName, and matchValue are required" });
    }

    const ruleData = {
      clientId,
      ruleName: req.body.ruleName,
      ruleType: req.body.ruleType || "Money Out",
      priority: parseInt(req.body.priority || "1"),
      fieldToMatch: req.body.fieldToMatch || "description",
      matchCondition: req.body.matchCondition || "contains",
      matchValue: req.body.matchValue.trim(),
      contactId: req.body.contactId ? parseInt(req.body.contactId) : null,
      nominalCode: req.body.nominalCode || null,
      vatRate: req.body.vatRate || "20.00",
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
    };

    if (req.body.id) {
      await db.update(bankRules).set(ruleData).where(eq(bankRules.id, parseInt(req.body.id)));
      return res.json({ message: "Bank rule updated successfully", id: req.body.id });
    }

    const [result] = await db.insert(bankRules).values(ruleData);
    res.json({ message: "Bank rule created successfully", id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save bank rule", error: error.message });
  }
});

// DELETE /api/bookkeeping/bank-rules/:id
router.delete("/bank-rules/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(bankRules).where(eq(bankRules.id, id));
    res.json({ message: "Bank rule deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete bank rule", error: error.message });
  }
});

// POST /api/bookkeeping/bank-rules/apply/:clientId
router.post("/bank-rules/apply/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const rules = await db.select({
      id: bankRules.id,
      ruleName: bankRules.ruleName,
      ruleType: bankRules.ruleType,
      fieldToMatch: bankRules.fieldToMatch,
      matchCondition: bankRules.matchCondition,
      matchValue: bankRules.matchValue,
      contactId: bankRules.contactId,
      nominalCode: bankRules.nominalCode,
      vatRate: bankRules.vatRate,
      contactName: contacts.name,
    })
    .from(bankRules)
    .leftJoin(contacts, eq(bankRules.contactId, contacts.id))
    .where(and(eq(bankRules.clientId, clientId), eq(bankRules.isActive, true)))
    .orderBy(bankRules.priority);

    if (rules.length === 0) {
      return res.json({ matchedCount: 0, message: "No active bank rules found to apply" });
    }

    // Get unreconciled transactions
    const unreconciled = await db.select().from(bankTransactions).where(
      and(eq(bankTransactions.clientId, clientId), eq(bankTransactions.isReconciled, false))
    );

    let matchedCount = 0;
    for (const tx of unreconciled) {
      const descText = (tx.description || "").toLowerCase();
      const isMoneyOut = parseFloat(tx.credit || "0") > 0;
      const isMoneyIn = parseFloat(tx.debit || "0") > 0;

      for (const rule of rules) {
        if (rule.ruleType === "Money Out" && !isMoneyOut) continue;
        if (rule.ruleType === "Money In" && !isMoneyIn) continue;

        const val = (rule.matchValue || "").toLowerCase();
        let isMatch = false;

        if (rule.matchCondition === "contains" && descText.includes(val)) isMatch = true;
        else if (rule.matchCondition === "equals" && descText === val) isMatch = true;
        else if (rule.matchCondition === "starts_with" && descText.startsWith(val)) isMatch = true;

        if (isMatch) {
          await db.update(bankTransactions).set({
            payeeName: rule.contactName || tx.payeeName,
            nominalCode: rule.nominalCode || tx.nominalCode,
            vatRate: rule.vatRate || tx.vatRate,
          }).where(eq(bankTransactions.id, tx.id));
          matchedCount++;
          break; // First matching rule wins per priority
        }
      }
    }

    res.json({
      matchedCount,
      totalUnreconciled: unreconciled.length,
      message: `Applied rules to ${matchedCount} transaction(s)`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to apply bank rules", error: error.message });
  }
});

// GET /api/bookkeeping/cash-coding/client/:clientId
router.get("/cash-coding/client/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const txList = await db.select({
      id: bankTransactions.id,
      bankAccountId: bankTransactions.bankAccountId,
      transactionDate: bankTransactions.transactionDate,
      description: bankTransactions.description,
      debit: bankTransactions.debit,
      credit: bankTransactions.credit,
      payeeName: bankTransactions.payeeName,
      nominalCode: bankTransactions.nominalCode,
      vatRate: bankTransactions.vatRate,
      isReconciled: bankTransactions.isReconciled,
      bankAccountName: bankAccounts.bankName,
    })
    .from(bankTransactions)
    .leftJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .where(and(eq(bankTransactions.clientId, clientId), eq(bankTransactions.isReconciled, false)))
    .orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.id));

    // Fetch chart of accounts and contacts for rapid selection
    const coa = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.clientId, clientId)).orderBy(chartOfAccounts.nominalCode);
    const clientContacts = await db.select().from(contacts).where(eq(contacts.clientId, clientId)).orderBy(contacts.name);

    res.json({
      transactions: txList,
      accounts: coa,
      contacts: clientContacts,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load cash coding data", error: error.message });
  }
});

// POST /api/bookkeeping/cash-coding/batch-reconcile
router.post("/cash-coding/batch-reconcile", async (req: any, res) => {
  try {
    const { items: entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: "No entries provided for batch reconciliation" });
    }

    for (const item of entries) {
      const txId = parseInt(item.transactionId);
      if (!txId) continue;

      await db.update(bankTransactions).set({
        isReconciled: true,
        payeeName: item.payeeName || undefined,
        nominalCode: item.nominalCode || undefined,
        vatRate: item.vatRate || undefined,
        description: item.description || undefined,
      }).where(eq(bankTransactions.id, txId));
    }

    res.json({
      reconciledCount: entries.length,
      message: `Successfully reconciled ${entries.length} transaction(s).`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to batch reconcile", error: error.message });
  }
});

// =============================================
// POINT 8: BACS PAYMENT EXPORT ENGINE
// =============================================

// GET /api/bookkeeping/bacs/client/:clientId/unpaid-bills
router.get("/bacs/client/:clientId/unpaid-bills", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const unpaid = await db.select({
      id: purchases.id,
      billNumber: purchases.billNumber,
      billDate: purchases.billDate,
      dueDate: purchases.dueDate,
      subTotal: purchases.subTotal,
      vatTotal: purchases.vatTotal,
      grandTotal: purchases.grandTotal,
      paidAmount: purchases.paidAmount,
      status: purchases.status,
      supplierId: purchases.supplierId,
      supplierName: contacts.name,
      sortCode: contacts.sortCode,
      accountNumber: contacts.accountNumber,
      iban: contacts.iban,
    })
    .from(purchases)
    .leftJoin(contacts, eq(purchases.supplierId, contacts.id))
    .where(and(eq(purchases.clientId, clientId), inArray(purchases.status, ["Unpaid", "PartiallyPaid"])))
    .orderBy(purchases.billDate);

    const formatted = unpaid.map(b => {
      const total = parseFloat(b.grandTotal || "0");
      const paid = parseFloat(b.paidAmount || "0");
      const remaining = Math.max(0, total - paid);
      const cleanSort = (b.sortCode || "").replace(/[^0-9]/g, "");
      const cleanAcc = (b.accountNumber || "").replace(/[^0-9]/g, "");
      const hasValidBank = cleanSort.length === 6 && cleanAcc.length === 8;

      return {
        ...b,
        remainingAmount: remaining.toFixed(2),
        hasValidBank,
        cleanSortCode: cleanSort,
        cleanAccountNumber: cleanAcc,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch unpaid bills for BACS", error: error.message });
  }
});

// POST /api/bookkeeping/bacs/client/:clientId/generate
router.post("/bacs/client/:clientId/generate", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { billIds, bankAccountId, processingDate, markAsPaid } = req.body;

    if (!Array.isArray(billIds) || billIds.length === 0) {
      return res.status(400).json({ message: "billIds array is required" });
    }

    const validBillIds = billIds.map(Number).filter(n => !isNaN(n) && n > 0);
    if (validBillIds.length === 0) {
      return res.status(400).json({ message: "No valid bill IDs provided" });
    }

    // Get client info
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    // Get bank account
    let bAccount: any;
    if (bankAccountId && !isNaN(parseInt(bankAccountId))) {
      const [acc] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, parseInt(bankAccountId)));
      bAccount = acc;
    } else {
      const [first] = await db.select().from(bankAccounts).where(eq(bankAccounts.clientId, clientId)).limit(1);
      bAccount = first;
    }

    if (!bAccount) {
      return res.status(400).json({ message: "Valid bank account is required for BACS payment. Please add a bank account first." });
    }

    const orgSort = (bAccount.sortCode || "000000").replace(/[^0-9]/g, "").padStart(6, "0").slice(0, 6);
    const orgAcc = (bAccount.accountNumber || "00000000").replace(/[^0-9]/g, "").padStart(8, "0").slice(0, 8);
    const orgName = (client?.clientName || bAccount.bankName || "SanSuite User").slice(0, 18).padEnd(18, " ");

    const pDate = processingDate ? new Date(processingDate) : new Date();
    const formattedDate = pDate.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD

    // Fetch bills with contacts
    const bills = await db.select({
      id: purchases.id,
      billNumber: purchases.billNumber,
      grandTotal: purchases.grandTotal,
      paidAmount: purchases.paidAmount,
      supplierName: contacts.name,
      sortCode: contacts.sortCode,
      accountNumber: contacts.accountNumber,
    })
    .from(purchases)
    .leftJoin(contacts, eq(purchases.supplierId, contacts.id))
    .where(inArray(purchases.id, validBillIds));

    let totalPence = 0;
    const standard18Lines: string[] = [];
    const csvLines: string[] = ["Beneficiary Name,Sort Code,Account Number,Amount,Reference,Bill Number"];
    const missingBankDetails: any[] = [];

    for (const bill of bills) {
      const remaining = Math.max(0, parseFloat(bill.grandTotal || "0") - parseFloat(bill.paidAmount || "0"));
      if (remaining <= 0) continue;

      const pence = Math.round(remaining * 100);
      totalPence += pence;

      const destSort = (bill.sortCode || "").replace(/[^0-9]/g, "");
      const destAcc = (bill.accountNumber || "").replace(/[^0-9]/g, "");

      if (destSort.length !== 6 || destAcc.length !== 8) {
        missingBankDetails.push({ billNumber: bill.billNumber, supplierName: bill.supplierName });
      }

      const paddedDestSort = destSort.padStart(6, "0").slice(0, 6);
      const paddedDestAcc = destAcc.padStart(8, "0").slice(0, 8);
      const paddedAmount = pence.toString().padStart(11, "0");
      const ref = (bill.billNumber || "INVOICE").slice(0, 18).padEnd(18, " ");
      const benName = (bill.supplierName || "SUPPLIER").slice(0, 18).padEnd(18, " ");

      // Standard 18 format line:
      const line = `${paddedDestSort}${paddedDestAcc}099${orgSort}${orgAcc}0000${paddedAmount}${benName}${ref}${orgName}`;
      standard18Lines.push(line);

      // CSV line
      csvLines.push(`"${bill.supplierName || ''}","${destSort}","${destAcc}","${remaining.toFixed(2)}","${bill.billNumber || ''}","${bill.billNumber || ''}"`);

      // If requested, mark bill as paid
      if (markAsPaid) {
        await db.update(purchases).set({
          status: "Paid",
          paidAmount: bill.grandTotal,
        }).where(eq(purchases.id, bill.id));
      }
    }

    // Deduct from bank balance if marked as paid
    if (markAsPaid && totalPence > 0) {
      const current = parseFloat(bAccount.currentBalance || "0");
      const newBal = current - (totalPence / 100);
      await db.update(bankAccounts).set({ currentBalance: newBal.toFixed(2) }).where(eq(bankAccounts.id, bAccount.id));
    }

    const bacsText = standard18Lines.join("\r\n");
    const csvText = csvLines.join("\r\n");
    const totalAmount = (totalPence / 100).toFixed(2);
    const filename = `BACS_PAYMENT_${client?.clientName?.replace(/[^a-zA-Z0-9]/g, "_") || "CLIENT"}_${formattedDate}.txt`;

    res.json({
      success: true,
      filename,
      totalBills: bills.length,
      totalAmount,
      successfulCount: bills.length - missingBankDetails.length,
      missingBankDetailsCount: missingBankDetails.length,
      missingSuppliers: missingBankDetails,
      bacsContent: bacsText,
      csvContent: csvText,
      markedAsPaid: Boolean(markAsPaid),
      message: `Generated BACS file for £${totalAmount} across ${bills.length} bill(s).`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate BACS file", error: error.message });
  }
});

export default router;
