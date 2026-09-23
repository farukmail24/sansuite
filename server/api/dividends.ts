import { Router } from "express";
import { db } from "../db";
import { dividends, contacts, clients, journalEntries, journalLines, bankAccounts, bankTransactions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// GET /api/dividends/:clientId — list all dividend declarations with shareholder details
router.get("/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const list = await db.select({
      id: dividends.id,
      clientId: dividends.clientId,
      shareholderId: dividends.shareholderId,
      shareholderName: contacts.name,
      shareholderEmail: contacts.email,
      voucherNumber: dividends.voucherNumber,
      shareType: dividends.shareType,
      shareClass: dividends.shareClass,
      numberOfShares: dividends.numberOfShares,
      ratePerShare: dividends.ratePerShare,
      dividendPayable: dividends.dividendPayable,
      taxCredit: dividends.taxCredit,
      grossDividend: dividends.grossDividend,
      excludeTaxCredit: dividends.excludeTaxCredit,
      declarationDate: dividends.declarationDate,
      paymentDate: dividends.paymentDate,
      postedJournalId: dividends.postedJournalId,
      date: dividends.date,
      totalAmount: dividends.totalAmount,
      declaredBy: dividends.declaredBy,
      notes: dividends.notes,
      createdAt: dividends.createdAt,
    })
    .from(dividends)
    .leftJoin(contacts, eq(dividends.shareholderId, contacts.id))
    .where(eq(dividends.clientId, clientId))
    .orderBy(desc(dividends.date));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch dividends", error: error.message });
  }
});

// GET /api/dividends/voucher/:id — fetch single dividend voucher for printing
router.get("/voucher/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [divRecord] = await db.select().from(dividends).where(eq(dividends.id, id));
    if (!divRecord) return res.status(404).json({ message: "Dividend voucher not found" });

    const [clientRecord] = await db.select().from(clients).where(eq(clients.id, divRecord.clientId));
    let shareholderRecord = null;
    if (divRecord.shareholderId) {
      const [sh] = await db.select().from(contacts).where(eq(contacts.id, divRecord.shareholderId));
      shareholderRecord = sh;
    }

    res.json({
      voucher: divRecord,
      client: clientRecord,
      shareholder: shareholderRecord,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch dividend voucher", error: error.message });
  }
});

// Handler function for dividend creation
async function handleCreateDividend(req: any, res: any) {
  try {
    const clientIdParam = req.params?.clientId || req.body?.clientId;
    if (!clientIdParam) {
      return res.status(400).json({ message: "Client ID is required" });
    }
    const clientId = parseInt(clientIdParam);
    const {
      shareholderId,
      declarationDate,
      paymentDate,
      shareType,
      shareClass,
      numberOfShares,
      ratePerShare,
      amount,
      excludeTaxCredit,
      postJournal,
      journalTarget,
      bankAccountId,
      declaredBy,
      notes
    } = req.body;

    const shId = shareholderId ? parseInt(shareholderId) : null;
    const numShares = parseFloat(numberOfShares || "0");
    const rate = parseFloat(ratePerShare || "0");

    let payable = 0;
    if (numShares > 0 && rate > 0) {
      payable = numShares * rate;
    } else if (amount) {
      payable = parseFloat(amount);
    }

    const exTax = !!excludeTaxCredit;
    // UK Dividend Tax Credit: previously 1/9th of net dividend for non-excluded dividends
    const taxCredit = exTax ? 0 : parseFloat((payable * 0.1111).toFixed(2));
    const gross = payable + taxCredit;

    const decDate = declarationDate ? new Date(declarationDate) : new Date();
    const payDate = paymentDate ? new Date(paymentDate) : decDate;
    const vNumber = `DIV-${Date.now().toString().slice(-6)}`;

    let postedJournalId: number | null = null;

    // Automatic double-entry journal posting if requested
    if (postJournal && payable > 0) {
      const target = journalTarget || "Bank"; // 'Bank' or 'DLA'
      const creditNominal = target === "DLA" ? "2100" : "1200"; // Director Loan or Bank
      const debitNominal = "3200"; // Dividends Paid / Equity Reserves

      const [journalRes] = await db.insert(journalEntries).values({
        clientId,
        journalNumber: `JRN-DIV-${Date.now().toString().slice(-6)}`,
        journalDate: payDate,
        reference: `Dividend ${vNumber}`,
        description: `Dividend declaration of £${payable.toFixed(2)} (${vNumber})`,
        totalAmount: payable.toFixed(2),
      });

      postedJournalId = journalRes.insertId;

      // Debit: Dividends Paid
      await db.insert(journalLines).values({
        journalId: postedJournalId,
        nominalCode: debitNominal,
        description: `Dividends Paid - ${vNumber}`,
        debit: payable.toFixed(2),
        credit: "0.00",
      });

      // Credit: Bank Account or DLA
      await db.insert(journalLines).values({
        journalId: postedJournalId,
        nominalCode: creditNominal,
        description: target === "DLA" ? `Director Loan Account - Dividend ${vNumber}` : `Bank Account - Dividend ${vNumber}`,
        debit: "0.00",
        credit: payable.toFixed(2),
      });

      // If Bank target and bank account provided, also insert into bank transactions
      if (target === "Bank" && bankAccountId) {
        const bId = parseInt(bankAccountId);
        await db.insert(bankTransactions).values({
          clientId,
          bankAccountId: bId,
          transactionDate: payDate,
          description: `Dividend Payment (${vNumber})`,
          debit: "0.00",
          credit: payable.toFixed(2), // Money out of bank
          isReconciled: false,
        });

        const [bank] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bId));
        if (bank) {
          const currentBal = parseFloat(bank.currentBalance || "0");
          await db.update(bankAccounts).set({
            currentBalance: (currentBal - payable).toFixed(2)
          }).where(eq(bankAccounts.id, bId));
        }
      }
    }

    const [result] = await db.insert(dividends).values({
      clientId,
      shareholderId: shId,
      voucherNumber: vNumber,
      shareType: shareType || "Equity",
      shareClass: shareClass || "Ordinary",
      numberOfShares: numShares.toFixed(2),
      ratePerShare: rate.toFixed(4),
      dividendPayable: payable.toFixed(2),
      taxCredit: taxCredit.toFixed(2),
      grossDividend: gross.toFixed(2),
      excludeTaxCredit: exTax,
      declarationDate: decDate,
      paymentDate: payDate,
      postedJournalId,
      date: payDate,
      totalAmount: payable.toFixed(2),
      declaredBy: declaredBy || "Board of Directors",
      notes: notes || "",
    });

    res.json({
      success: true,
      id: result.insertId,
      voucherNumber: vNumber,
      dividendPayable: payable.toFixed(2),
      taxCredit: taxCredit.toFixed(2),
      grossDividend: gross.toFixed(2),
      postedJournalId,
      message: `Dividend voucher ${vNumber} generated successfully.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create dividend", error: error.message });
  }
}

// Support both POST /api/dividends and POST /api/dividends/:clientId
router.post("/", handleCreateDividend);
router.post("/:clientId", handleCreateDividend);

// DELETE /api/dividends/:id — delete dividend record
router.delete("/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [divRecord] = await db.select().from(dividends).where(eq(dividends.id, id));
    if (divRecord && divRecord.postedJournalId) {
      await db.delete(journalLines).where(eq(journalLines.journalId, divRecord.postedJournalId));
      await db.delete(journalEntries).where(eq(journalEntries.id, divRecord.postedJournalId));
    }
    await db.delete(dividends).where(eq(dividends.id, id));
    res.json({ success: true, message: "Dividend voucher deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete dividend", error: error.message });
  }
});

export default router;
