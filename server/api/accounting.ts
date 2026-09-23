import { Router } from "express";
import { db } from "../db";
import {
  accountingPeriods, clients, annualReports, trialBalances, firmDetails
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import { HMRC_Gateway } from "../lib/hmrcGateway";

const router = Router();
router.use(authMiddleware);



// ─── ACCOUNTING PERIODS ───────────────────────────────────────────────────────

router.get("/periods/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const periods = await db.select().from(accountingPeriods)
      .where(eq(accountingPeriods.clientId, clientId));
    res.json(periods);
  } catch {
    res.status(500).json({ message: "Failed to fetch periods" });
  }
});

router.post("/periods", async (req: any, res) => {
  try {
    const { clientId, startDate, endDate, dueDate } = req.body;
    const [result] = await db.insert(accountingPeriods).values({
      clientId: parseInt(clientId),
      startDate,
      endDate,
      dueDate,
    });
    res.json({ id: result.insertId, clientId, startDate, endDate, dueDate });
  } catch {
    res.status(500).json({ message: "Failed to create period" });
  }
});

// ─── ANNUAL REPORTS ───────────────────────────────────────────────────────────

router.get("/annual-reports/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const reports = await db.select().from(annualReports)
      .where(eq(annualReports.clientId, clientId));
    res.json(reports);
  } catch {
    res.status(500).json({ message: "Failed to fetch annual reports" });
  }
});

router.post("/annual-reports", async (req: any, res) => {
  try {
    const { clientId, periodId, reportType, description } = req.body;
    const existing = await db.select().from(annualReports)
      .where(eq(annualReports.clientId, parseInt(clientId)));
    const refNo = `AR-${existing.length + 1}`;

    const [result] = await db.insert(annualReports).values({
      clientId: parseInt(clientId),
      periodId: periodId ? parseInt(periodId) : undefined,
      refNo,
      reportType: reportType || "Full",
      description,
      submissionStatus: "Draft",
    });
    res.json({ id: result.insertId, refNo, ...req.body });
  } catch {
    res.status(500).json({ message: "Failed to create report" });
  }
});

// ─── TRIAL BALANCES ───────────────────────────────────────────────────────────

router.get("/trial-balances/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const tbs = await db.select().from(trialBalances)
      .where(eq(trialBalances.clientId, clientId));
    res.json(tbs);
  } catch {
    res.status(500).json({ message: "Failed to fetch trial balances" });
  }
});

router.post("/trial-balances", async (req: any, res) => {
  try {
    const { clientId, description, fromDate, toDate, modeOfImport } = req.body;
    const existing = await db.select().from(trialBalances)
      .where(eq(trialBalances.clientId, parseInt(clientId)));
    const refNo = `TB-${existing.length + 1}`;

    const [result] = await db.insert(trialBalances).values({
      clientId: parseInt(clientId),
      refNo,
      description,
      fromDate,
      toDate,
      modeOfImport: modeOfImport || "Manual",
      status: "Draft",
    });
    res.json({ id: result.insertId, refNo, ...req.body });
  } catch {
    res.status(500).json({ message: "Failed to create trial balance" });
  }
});

export default router;
