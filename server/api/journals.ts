import { Router } from "express";
import { db } from "../db";
import { journalEntries, journalLines, chartOfAccounts } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

router.get("/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const journals = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.clientId, clientId))
      .orderBy(desc(journalEntries.journalDate));
      
    // Fetch lines for each journal
    const journalsWithLines = await Promise.all(journals.map(async (j) => {
      const lines = await db.select({
        id: journalLines.id,
        nominalCode: journalLines.nominalCode,
        description: journalLines.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
        accountName: chartOfAccounts.name
      })
      .from(journalLines)
      .leftJoin(chartOfAccounts, and(eq(journalLines.nominalCode, chartOfAccounts.nominalCode), eq(chartOfAccounts.clientId, clientId)))
      .where(eq(journalLines.journalId, j.id));
      
      return { ...j, lines };
    }));

    res.json(journalsWithLines);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch journals" });
  }
});

router.post("/", async (req: any, res) => {
  try {
    const { clientId, journalDate, reference, description, totalAmount, lines } = req.body;
    
    // Auto-generate journal number
    const existing = await db.select().from(journalEntries)
      .where(eq(journalEntries.clientId, parseInt(clientId)));
    const journalNumber = `JN-${existing.length + 1000}`;

    const [result] = await db.insert(journalEntries).values({
      clientId: parseInt(clientId),
      journalNumber,
      journalDate: new Date(journalDate),
      reference,
      description,
      totalAmount: totalAmount.toString(),
    });

    const journalId = result.insertId;

    // Insert lines
    if (lines && lines.length > 0) {
      await db.insert(journalLines).values(
        lines.map((l: any) => ({
          journalId,
          nominalCode: l.nominalCode,
          description: l.description || description,
          debit: l.debit || "0.00",
          credit: l.credit || "0.00"
        }))
      );
    }

    res.json({ id: journalId, journalNumber });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save journal entry", error: error.message });
  }
});

export default router;
