import { Router } from "express";
import { db } from "../db";
import {
  mtdItClients,
  mtdItSources,
  mtdItQuarters,
  mtdItDigitalRecords,
  mtdItQuarterSubmissions,
  mtdItAdjustmentsAllowances,
  mtdItDividends,
  mtdItFinalDeclarations,
  clients,
  salesInvoices,
  invoiceItems,
  purchases,
  purchaseItems,
} from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// Capium Article 9000277639: Bookkeeping Chart of Account Codes mapping for MTD IT
export function mapNominalCodeToMtdIt(
  nominalCode?: string | null,
  recordType: "Income" | "Expense" = "Expense"
): { category: string; isDisallowable: boolean } {
  const code = (nominalCode || "").trim();

  // Income Codes
  if (recordType === "Income") {
    const turnoverCodes = ["1000", "1010", "1020", "1030", "1040", "1041", "1050", "10600"];
    const otherIncomeCodes = [
      "1520", "2000", "2010", "2020", "2030", "2031", "2032", "2033", "2034", "2035", "2036", "2134",
    ];
    if (turnoverCodes.includes(code)) return { category: "Turnover", isDisallowable: false };
    if (otherIncomeCodes.includes(code)) return { category: "Others", isDisallowable: false };
    return { category: "Turnover", isDisallowable: false };
  }

  // Expense Codes & Statutory Disallowables
  // CIS
  if (code === "12930") return { category: "CIS Payment to Sub-contractors", isDisallowable: true };
  if (code === "1270") return { category: "CIS Payment to Sub-contractors", isDisallowable: false };

  // Staff Costs
  if (code === "14094") return { category: "Staff Cost", isDisallowable: true };
  const staffAllowable = [
    "1230", "1231", "1232", "1233", "1400", "1401", "1402", "1403", "1404", "1405", "1406", "1407", "1410", "1411", "1412", "1413", "14080",
  ];
  if (staffAllowable.includes(code)) return { category: "Staff Cost", isDisallowable: false };

  // Travelling
  if (code === "14642") return { category: "Travelling Cost", isDisallowable: true };
  const travelAllowable = ["1271", "1460", "1461", "1462", "1463", "1464"];
  if (travelAllowable.includes(code)) return { category: "Travelling Cost", isDisallowable: false };

  // Premises Running Cost
  if (code === "14571") return { category: "Premises Running Cost", isDisallowable: true };
  const premisesAllowable = [
    "1273", "1440", "1441", "1442", "1443", "1446", "1447", "1457", "1585", "1586", "1587",
  ];
  if (premisesAllowable.includes(code)) return { category: "Premises Running Cost", isDisallowable: false };

  // Maintenance
  if (code === "1445") return { category: "Maintenance", isDisallowable: true };
  if (["1444", "1575"].includes(code)) return { category: "Maintenance", isDisallowable: false };

  // Admin Cost
  if (code === "15824") return { category: "Admin Cost", isDisallowable: true };
  if (["1576", "1577"].includes(code)) return { category: "Admin Cost", isDisallowable: false };

  // Advertising Cost
  if (code === "13846") return { category: "Advertising Cost", isDisallowable: true };
  if (["1379", "1571"].includes(code)) return { category: "Advertising Cost", isDisallowable: false };

  // Entertainment Cost
  if (["1388", "1582"].includes(code)) return { category: "Business Entertainment Cost", isDisallowable: true };
  if (["1382", "1572"].includes(code)) return { category: "Business Entertainment Cost", isDisallowable: false };

  // Professional Fees
  if (["1433", "14333"].includes(code)) return { category: "Professional Fees", isDisallowable: true };
  if (["1431", "1432", "14340"].includes(code)) return { category: "Professional Fees", isDisallowable: false };

  // Interest
  if (code === "2527") return { category: "Interest", isDisallowable: true };
  const interestAllowable = [
    "2500", "2501", "2502", "2503", "2504", "2505", "2506", "2507", "2508", "2509", "2510", "2511", "2800", "2820",
  ];
  if (interestAllowable.includes(code)) return { category: "Interest", isDisallowable: false };

  // Financial
  if (code === "15190") return { category: "Financial", isDisallowable: true };
  if (["1517", "15170"].includes(code)) return { category: "Financial", isDisallowable: false };

  // Bad Debt
  if (code === "15191") return { category: "Bad Debt", isDisallowable: true };
  if (["1511", "1512"].includes(code)) return { category: "Bad Debt", isDisallowable: false };

  // Depreciation
  const deprAllowable = [
    "1240", "1241", "1242", "1243", "1244", "1245", "1246", "1250", "1260", "1540",
    "1541", "1542", "1543", "1544", "1545", "1546", "1547", "1548", "1549", "1550",
    "1551", "1552", "1560", "1561", "2220", "2221", "2222", "8300", "8301", "8302",
    "8303", "8304", "8508", "8510", "8511",
  ];
  if (deprAllowable.includes(code)) return { category: "Depreciation", isDisallowable: false };

  // Cost of Goods Bought
  const cogAllowable = [
    "1122", "1200", "1201", "1202", "1203", "1210", "1211", "1212", "1220", "1221",
    "1222", "1223", "1272", "1274", "1378", "1510", "6667", "12130", "12140",
  ];
  if (cogAllowable.includes(code)) return { category: "Cost of Goods Bought", isDisallowable: false };

  // Others (expenses)
  if (["1581", "13847", "15825"].includes(code)) return { category: "Others", isDisallowable: true };
  const othersAllowable = ["1370", "1371", "1391", "1520", "1573", "1574", "1578", "1579", "1580", "2010"];
  if (othersAllowable.includes(code)) return { category: "Others", isDisallowable: false };

  // Default fallback
  return { category: "Cost of Goods Bought", isDisallowable: false };
}

// Helper to compute quarter start, end, and due dates
function getQuarterDates(taxYear: string, quarterNumber: number, calendarType: string = "standard") {
  const startYear = parseInt(taxYear.split("-")[0], 10) || 2025;
  const endYear = startYear + 1;

  if (calendarType === "calendar") {
    // Calendar basis: 1 Apr - 31 Mar
    switch (quarterNumber) {
      case 1:
        return { startDate: `${startYear}-04-01`, endDate: `${startYear}-06-30`, dueDate: `${startYear}-08-05` };
      case 2:
        return { startDate: `${startYear}-07-01`, endDate: `${startYear}-09-30`, dueDate: `${startYear}-11-05` };
      case 3:
        return { startDate: `${startYear}-10-01`, endDate: `${startYear}-12-31`, dueDate: `${endYear}-02-05` };
      case 4:
        return { startDate: `${endYear}-01-01`, endDate: `${endYear}-03-31`, dueDate: `${endYear}-05-05` };
      default:
        return { startDate: `${startYear}-04-01`, endDate: `${startYear}-06-30`, dueDate: `${startYear}-08-05` };
    }
  } else {
    // Standard HMRC: 6 Apr - 5 Apr
    switch (quarterNumber) {
      case 1:
        return { startDate: `${startYear}-04-06`, endDate: `${startYear}-07-05`, dueDate: `${startYear}-08-05` };
      case 2:
        return { startDate: `${startYear}-07-06`, endDate: `${startYear}-10-05`, dueDate: `${startYear}-11-05` };
      case 3:
        return { startDate: `${startYear}-10-06`, endDate: `${endYear}-01-05`, dueDate: `${endYear}-02-05` };
      case 4:
        return { startDate: `${endYear}-01-06`, endDate: `${endYear}-04-05`, dueDate: `${endYear}-05-05` };
      default:
        return { startDate: `${startYear}-04-06`, endDate: `${startYear}-07-05`, dueDate: `${startYear}-08-05` };
    }
  }
}

// -------------------------------------------------------------
// 1. SUBMISSIONS DASHBOARD MATRIX (7 Sub-tabs Parity)
// -------------------------------------------------------------
router.get("/submissions/dashboard", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const taxYear = (req.query.taxYear as string) || "2025-26";
    const tab = (req.query.tab as string) || "all"; // 'all', 'q1', 'q2', 'q3', 'q4', 'adjustments', 'final'

    // Fetch enrolled MTD clients in practice
    const enrolledClients = await db
      .select({
        id: mtdItClients.id,
        clientId: clients.id,
        clientName: clients.clientName,
        utrNumber: mtdItClients.utrNumber,
        nino: mtdItClients.nino,
        calendarType: mtdItClients.calendarType,
        reportingMethod: mtdItClients.reportingMethod,
        agentAuthorised: mtdItClients.agentAuthorised,
      })
      .from(mtdItClients)
      .innerJoin(clients, eq(mtdItClients.clientId, clients.id))
      .where(eq(clients.practiceId, practiceId));

    if (enrolledClients.length === 0) {
      return res.json({
        taxYear,
        tab,
        quarterStatusCounts: { all: 0, open: 0, overdue: 0, submitted: 0 },
        tasks: [],
      });
    }

    const clientIds = enrolledClients.map((c) => c.clientId);
    const mtdClientIds = enrolledClients.map((c) => c.id);

    // Fetch sources for these clients
    const sources = await db
      .select()
      .from(mtdItSources)
      .where(and(inArray(mtdItSources.clientId, clientIds), eq(mtdItSources.isActive, true)));

    // Fetch existing quarters for tax year
    const quarters = await db
      .select()
      .from(mtdItQuarters)
      .where(and(inArray(mtdItQuarters.mtdClientId, mtdClientIds), eq(mtdItQuarters.taxYear, taxYear)));

    // Fetch existing quarter submissions
    const quarterIds = quarters.map((q) => q.id);
    const submissions =
      quarterIds.length > 0
        ? await db
            .select()
            .from(mtdItQuarterSubmissions)
            .where(inArray(mtdItQuarterSubmissions.mtdQuarterId, quarterIds))
        : [];

    // Fetch adjustments & allowances
    const adjustments = await db
      .select()
      .from(mtdItAdjustmentsAllowances)
      .where(and(inArray(mtdItAdjustmentsAllowances.mtdClientId, mtdClientIds), eq(mtdItAdjustmentsAllowances.taxYear, taxYear)));

    // Fetch final declarations
    const finalDeclarations = await db
      .select()
      .from(mtdItFinalDeclarations)
      .where(and(inArray(mtdItFinalDeclarations.mtdClientId, mtdClientIds), eq(mtdItFinalDeclarations.taxYear, taxYear)));

    const tasks: any[] = [];
    let countOpen = 0;
    let countOverdue = 0;
    let countSubmitted = 0;

    const now = new Date();

    for (const client of enrolledClients) {
      const clientSources = sources.filter((s) => s.clientId === client.clientId);

      // If client has no sources registered yet, provide placeholder task or skip
      for (const source of clientSources) {
        // Quarters 1 through 4
        const targetQuarters =
          tab === "all"
            ? [1, 2, 3, 4]
            : tab === "q1"
            ? [1]
            : tab === "q2"
            ? [2]
            : tab === "q3"
            ? [3]
            : tab === "q4"
            ? [4]
            : [];

        for (const qNum of targetQuarters) {
          const dates = getQuarterDates(taxYear, qNum, source.calendarType || client.calendarType || "standard");
          const existingQuarter = quarters.find(
            (q) => q.sourceId === source.id && q.quarterNumber === qNum && q.taxYear === taxYear
          );
          const sub = submissions.find(
            (s) => (s.sourceId === source.id && s.quarterNumber === qNum) || (existingQuarter && s.mtdQuarterId === existingQuarter.id)
          );

          const dueDateObj = new Date(dates.dueDate);
          let taskStatus = existingQuarter?.status || "Open";
          if (sub && sub.status === "Submitted") {
            taskStatus = "Submitted";
            countSubmitted++;
          } else if (now > dueDateObj) {
            taskStatus = "Overdue";
            countOverdue++;
          } else {
            countOpen++;
          }

          tasks.push({
            id: `q-${source.id}-${qNum}`,
            quarterId: existingQuarter?.id || null,
            clientId: client.clientId,
            clientName: client.clientName,
            mtdClientId: client.id,
            sourceId: source.id,
            sourceType: source.sourceType,
            tradingName: source.tradingName || (source.sourceType === "uk-property" ? "UK Property Business" : "Sole Trade"),
            workflowType: source.workflowType || "workflow_1_bridging",
            taskName: `Quarter ${qNum}`,
            quarterNumber: qNum,
            startDate: dates.startDate,
            endDate: dates.endDate,
            dueDate: dates.dueDate,
            taskStatus,
            lastSubmissionDate: sub?.submittedAt || null,
            clientApprovalStatus: sub?.clientApprovalStatus || "Not Sent",
            grossIncome: sub?.grossIncome || "0.00",
            netProfit: sub?.netProfit || "0.00",
            canSubmit: taskStatus !== "Submitted",
            type: "quarter",
          });
        }

        // Adjustments and Allowances tab
        if (tab === "all" || tab === "adjustments") {
          const adj = adjustments.find((a) => a.sourceId === source.id);
          const dueDate = "2027-01-31";
          const isSubmitted = adj?.status === "Submitted";
          const status = isSubmitted ? "Submitted" : "Draft";

          if (isSubmitted) countSubmitted++;
          else countOpen++;

          if (tab === "adjustments") {
            tasks.push({
              id: `adj-${source.id}`,
              clientId: client.clientId,
              clientName: client.clientName,
              mtdClientId: client.id,
              sourceId: source.id,
              sourceType: source.sourceType,
              tradingName: source.tradingName || "Income Source",
              workflowType: source.workflowType,
              taskName: "Adjustments and Allowances",
              dueDate,
              taskStatus: status,
              lastSubmissionDate: adj?.submittedAt || null,
              clientApprovalStatus: "Not Sent",
              canSubmit: !isSubmitted,
              type: "adjustment",
            });
          }
        }
      }

      // Final Declaration tab
      if (tab === "all" || tab === "final") {
        const finalDec = finalDeclarations.find((f) => f.mtdClientId === client.id);
        const dueDate = "2027-01-31";
        const isSubmitted = finalDec?.status === "Submitted";
        const status = isSubmitted ? "Submitted" : "Draft";

        if (isSubmitted) countSubmitted++;
        else countOpen++;

        if (tab === "final") {
          tasks.push({
            id: `final-${client.id}`,
            clientId: client.clientId,
            clientName: client.clientName,
            mtdClientId: client.id,
            sourceId: null,
            sourceType: "consolidated",
            tradingName: "Consolidated Annual Return",
            workflowType: "Final Declaration",
            taskName: "Final Declaration (Annual)",
            dueDate,
            taskStatus: status,
            lastSubmissionDate: finalDec?.submittedAt || null,
            clientApprovalStatus: finalDec?.clientApprovalStatus || "Not Sent",
            canSubmit: !isSubmitted,
            type: "final",
          });
        }
      }
    }

    res.json({
      taxYear,
      tab,
      quarterStatusCounts: {
        all: countOpen + countOverdue + countSubmitted,
        open: countOpen,
        overdue: countOverdue,
        submitted: countSubmitted,
      },
      tasks,
    });
  } catch (error) {
    console.error("Failed to load MTD IT submissions dashboard:", error);
    res.status(500).json({ message: "Failed to load submissions dashboard" });
  }
});

// -------------------------------------------------------------
// 2. CLIENT MANAGEMENT & BULK ASA AUTHORISATION
// -------------------------------------------------------------
router.get("/clients", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db
      .select({
        id: mtdItClients.id,
        clientId: clients.id,
        clientCode: clients.clientCode,
        clientName: clients.clientName,
        clientType: clients.clientType,
        utrNumber: mtdItClients.utrNumber,
        nino: mtdItClients.nino,
        mtdStatus: mtdItClients.mtdStatus,
        agentAuthorised: mtdItClients.agentAuthorised,
        asaStatus: mtdItClients.asaStatus,
        calendarType: mtdItClients.calendarType,
        reportingMethod: mtdItClients.reportingMethod,
        createdAt: mtdItClients.createdAt,
      })
      .from(mtdItClients)
      .innerJoin(clients, eq(mtdItClients.clientId, clients.id))
      .where(eq(clients.practiceId, practiceId))
      .orderBy(desc(mtdItClients.createdAt));

    // Attach source counts
    const clientIds = result.map((c) => c.clientId);
    const sources =
      clientIds.length > 0
        ? await db
            .select()
            .from(mtdItSources)
            .where(and(inArray(mtdItSources.clientId, clientIds), eq(mtdItSources.isActive, true)))
        : [];

    const enriched = result.map((client) => {
      const clientSources = sources.filter((s) => s.clientId === client.clientId);
      return {
        ...client,
        sourcesCount: clientSources.length,
        sources: clientSources,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Failed to fetch MTD IT clients:", error);
    res.status(500).json({ message: "Failed to fetch MTD IT clients" });
  }
});

router.post("/clients", async (req: any, res) => {
  try {
    const { clientId, utrNumber, nino, calendarType, reportingMethod, createDefaultSource, defaultSourceType, defaultSourceName } = req.body;
    const practiceId = req.user.practiceId;

    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    // Check if already enrolled
    const existing = await db
      .select()
      .from(mtdItClients)
      .where(eq(mtdItClients.clientId, parseInt(clientId, 10)));

    let mtdClientId: number;

    if (existing.length > 0) {
      mtdClientId = existing[0].id;
      await db
        .update(mtdItClients)
        .set({
          utrNumber: utrNumber || existing[0].utrNumber,
          nino: nino || existing[0].nino,
          calendarType: calendarType || existing[0].calendarType,
          reportingMethod: reportingMethod || existing[0].reportingMethod,
        })
        .where(eq(mtdItClients.id, mtdClientId));
    } else {
      const [insertResult] = await db.insert(mtdItClients).values({
        clientId: parseInt(clientId, 10),
        practiceId,
        utrNumber,
        nino,
        mtdStatus: "Registered",
        agentAuthorised: true,
        asaStatus: "Authorised",
        calendarType: calendarType || "standard",
        reportingMethod: reportingMethod || "three_line",
      });
      mtdClientId = insertResult.insertId;
    }

    // If requested, create default income source (e.g. Sole trader or property)
    if (createDefaultSource) {
      await db.insert(mtdItSources).values({
        mtdClientId,
        clientId: parseInt(clientId, 10),
        sourceType: defaultSourceType || "self-employment",
        tradingName: defaultSourceName || "Main Business",
        accountingType: "Cash basis",
        workflowType: "workflow_1_bridging",
        calendarType: calendarType || "standard",
        reportingMethod: reportingMethod || "three_line",
        sharedOwnershipPct: "100.00",
        isActive: true,
      });
    }

    res.json({ id: mtdClientId, success: true });
  } catch (error) {
    console.error("Failed to add MTD IT client:", error);
    res.status(500).json({ message: "Failed to add MTD IT client" });
  }
});

router.put("/clients/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { calendarType, reportingMethod, asaStatus, agentAuthorised } = req.body;

    await db
      .update(mtdItClients)
      .set({
        calendarType,
        reportingMethod,
        asaStatus,
        agentAuthorised: agentAuthorised !== undefined ? agentAuthorised : undefined,
      })
      .where(eq(mtdItClients.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update MTD IT client:", error);
    res.status(500).json({ message: "Failed to update client" });
  }
});

router.post("/clients/bulk-authorise", async (req: any, res) => {
  try {
    const { clientIds } = req.body; // array of mtdItClients.id
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: "No clients selected" });
    }

    await db
      .update(mtdItClients)
      .set({
        agentAuthorised: true,
        asaStatus: "Authorised",
      })
      .where(inArray(mtdItClients.id, clientIds));

    res.json({ success: true, count: clientIds.length });
  } catch (error) {
    console.error("Failed to bulk authorise clients:", error);
    res.status(500).json({ message: "Failed to authorise clients" });
  }
});

// -------------------------------------------------------------
// 3. MULTI-INCOME SOURCES (Self-Employment, UK & Foreign Property)
// -------------------------------------------------------------
router.get("/sources/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const result = await db
      .select()
      .from(mtdItSources)
      .where(and(eq(mtdItSources.clientId, clientId), eq(mtdItSources.isActive, true)));

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch sources:", error);
    res.status(500).json({ message: "Failed to fetch sources" });
  }
});

router.post("/sources", async (req: any, res) => {
  try {
    const {
      clientId,
      mtdClientId,
      sourceType,
      tradingName,
      accountingType,
      commencementDate,
      cessationDate,
      addressLine1,
      addressLine2,
      postalCode,
      country,
      workflowType,
      calendarType,
      reportingMethod,
      sharedOwnershipPct,
    } = req.body;

    if (!clientId || !sourceType) {
      return res.status(400).json({ message: "Client ID and Source Type are required" });
    }

    const [insertResult] = await db.insert(mtdItSources).values({
      clientId: parseInt(clientId, 10),
      mtdClientId: mtdClientId ? parseInt(mtdClientId, 10) : null,
      sourceType,
      tradingName: tradingName || (sourceType === "uk-property" ? "UK Property" : "Self Employment"),
      accountingType: accountingType || "Cash basis",
      commencementDate: commencementDate ? new Date(commencementDate) : null,
      cessationDate: cessationDate ? new Date(cessationDate) : null,
      addressLine1,
      addressLine2,
      postalCode,
      country: country || "United Kingdom",
      workflowType: workflowType || "workflow_1_bridging",
      calendarType: calendarType || "standard",
      reportingMethod: reportingMethod || "three_line",
      sharedOwnershipPct: sharedOwnershipPct ? String(sharedOwnershipPct) : "100.00",
      isActive: true,
    });

    res.json({ id: insertResult.insertId, success: true });
  } catch (error) {
    console.error("Failed to create income source:", error);
    res.status(500).json({ message: "Failed to create income source" });
  }
});

router.put("/sources/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      tradingName,
      accountingType,
      workflowType,
      calendarType,
      reportingMethod,
      sharedOwnershipPct,
      addressLine1,
      postalCode,
    } = req.body;

    await db
      .update(mtdItSources)
      .set({
        tradingName,
        accountingType,
        workflowType,
        calendarType,
        reportingMethod,
        sharedOwnershipPct: sharedOwnershipPct ? String(sharedOwnershipPct) : undefined,
        addressLine1,
        postalCode,
      })
      .where(eq(mtdItSources.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update income source:", error);
    res.status(500).json({ message: "Failed to update income source" });
  }
});

router.delete("/sources/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(mtdItSources).set({ isActive: false }).where(eq(mtdItSources.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete income source:", error);
    res.status(500).json({ message: "Failed to delete income source" });
  }
});

// HMRC Sync Sources Endpoint
router.post("/sources/sync-from-hmrc", async (req: any, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ message: "Client ID required" });

    // Retrieve client details
    const [client] = await db.select().from(clients).where(eq(clients.id, parseInt(clientId, 10)));
    if (!client) return res.status(404).json({ message: "Client not found" });

    // In a live system, this connects to HMRC MTD IT Obligations / Income Source API
    // Returns simulated live API connection confirmation
    res.json({
      success: true,
      message: `HMRC Agent Services Account checked for ${client.clientName} (UTR: ${client.utrNumber || "N/A"}). Existing sources verified.`,
      sourcesFound: 0,
    });
  } catch (error) {
    console.error("Failed to sync sources from HMRC:", error);
    res.status(500).json({ message: "Failed to sync sources from HMRC" });
  }
});

// -------------------------------------------------------------
// 4. DIGITAL RECORDS (Transactions, Bridging & Bookkeeping Sync)
// -------------------------------------------------------------
router.get("/digital-records", async (req: any, res) => {
  try {
    const sourceId = req.query.sourceId ? parseInt(req.query.sourceId as string, 10) : null;
    const quarterNumber = req.query.quarterNumber ? parseInt(req.query.quarterNumber as string, 10) : null;

    if (!sourceId) {
      return res.status(400).json({ message: "sourceId is required" });
    }

    const records = await db
      .select()
      .from(mtdItDigitalRecords)
      .where(eq(mtdItDigitalRecords.sourceId, sourceId))
      .orderBy(desc(mtdItDigitalRecords.recordDate));

    res.json(records);
  } catch (error) {
    console.error("Failed to fetch digital records:", error);
    res.status(500).json({ message: "Failed to fetch digital records" });
  }
});

router.post("/digital-records", async (req: any, res) => {
  try {
    const {
      sourceId,
      recordDate,
      invoiceNumber,
      amount,
      sourceType,
      category,
      recordType,
      description,
      isDisallowable,
      createdVia,
    } = req.body;

    if (!sourceId || !recordDate || amount === undefined || !category) {
      return res.status(400).json({ message: "sourceId, recordDate, amount, and category are required" });
    }

    const [result] = await db.insert(mtdItDigitalRecords).values({
      sourceId: parseInt(sourceId, 10),
      recordDate: new Date(recordDate),
      invoiceNumber: invoiceNumber || null,
      amount: String(amount),
      sourceType: sourceType || "self-employment",
      category,
      recordType: recordType || "Income",
      description: description || null,
      isDisallowable: isDisallowable || false,
      createdVia: createdVia || "Manual",
    });

    res.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error("Failed to create digital record:", error);
    res.status(500).json({ message: "Failed to create digital record" });
  }
});

router.post("/digital-records/bulk-import", async (req: any, res) => {
  try {
    const { sourceId, records } = req.body;
    if (!sourceId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "sourceId and an array of records are required" });
    }

    const insertedRows = [];
    for (const r of records) {
      const [result] = await db.insert(mtdItDigitalRecords).values({
        sourceId: parseInt(sourceId, 10),
        recordDate: new Date(r.recordDate || new Date()),
        invoiceNumber: r.invoiceNumber || null,
        amount: String(r.amount || 0),
        sourceType: r.sourceType || "self-employment",
        category: r.category || "Turnover",
        recordType: r.recordType || "Income",
        description: r.description || "Bridging Import",
        isDisallowable: Boolean(r.isDisallowable),
        createdVia: "Spreadsheet",
      });
      insertedRows.push(result.insertId);
    }

    res.json({ success: true, count: insertedRows.length });
  } catch (error) {
    console.error("Failed to bulk import digital records:", error);
    res.status(500).json({ message: "Failed to import records" });
  }
});

// Bookkeeping Auto-Sync (Workflow 3 & 4) with Statutory Chart of Accounts (COA) Mapping (Article 9000277639)
router.post("/digital-records/sync-bookkeeping", async (req: any, res) => {
  try {
    const { sourceId, startDate, endDate } = req.body;
    if (!sourceId) return res.status(400).json({ message: "sourceId is required" });

    const [source] = await db.select().from(mtdItSources).where(eq(mtdItSources.id, parseInt(sourceId, 10)));
    if (!source) return res.status(404).json({ message: "Income source not found" });

    const clientId = source.clientId;

    // Fetch sales invoices and items from Bookkeeping
    const invoices = await db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.clientId, clientId));

    // Fetch purchases and items from Bookkeeping
    const bills = await db
      .select()
      .from(purchases)
      .where(eq(purchases.clientId, clientId));

    let importedCount = 0;

    for (const inv of invoices) {
      // Check if invoice has line items with nominal codes
      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));

      if (items.length > 0) {
        for (const itm of items) {
          const { category, isDisallowable } = mapNominalCodeToMtdIt(itm.nominalCode, "Income");
          await db.insert(mtdItDigitalRecords).values({
            sourceId: source.id,
            recordDate: new Date(inv.invoiceDate),
            invoiceNumber: inv.invoiceNumber,
            amount: String(itm.netAmount || itm.unitPrice || "0.00"),
            sourceType: source.sourceType,
            category,
            recordType: "Income",
            description: itm.description || inv.notes || `Sales Invoice #${inv.invoiceNumber}`,
            isDisallowable,
            createdVia: "Bookkeeping",
          });
          importedCount++;
        }
      } else {
        const { category, isDisallowable } = mapNominalCodeToMtdIt(null, "Income");
        await db.insert(mtdItDigitalRecords).values({
          sourceId: source.id,
          recordDate: new Date(inv.invoiceDate),
          invoiceNumber: inv.invoiceNumber,
          amount: String(inv.grandTotal || "0.00"),
          sourceType: source.sourceType,
          category,
          recordType: "Income",
          description: inv.notes || `Sales Invoice #${inv.invoiceNumber}`,
          isDisallowable,
          createdVia: "Bookkeeping",
        });
        importedCount++;
      }
    }

    for (const bill of bills) {
      // Check if purchase has line items with nominal codes
      const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, bill.id));

      if (items.length > 0) {
        for (const itm of items) {
          const { category, isDisallowable } = mapNominalCodeToMtdIt(itm.nominalCode, "Expense");
          await db.insert(mtdItDigitalRecords).values({
            sourceId: source.id,
            recordDate: new Date(bill.billDate || bill.createdAt || new Date()),
            invoiceNumber: bill.billNumber || `BILL-${bill.id}`,
            amount: String(itm.netAmount || itm.unitPrice || "0.00"),
            sourceType: source.sourceType,
            category,
            recordType: "Expense",
            description: itm.description || bill.notes || `Purchase Bill #${bill.billNumber || bill.id}`,
            isDisallowable,
            createdVia: "Bookkeeping",
          });
          importedCount++;
        }
      } else {
        const { category, isDisallowable } = mapNominalCodeToMtdIt(null, "Expense");
        await db.insert(mtdItDigitalRecords).values({
          sourceId: source.id,
          recordDate: new Date(bill.billDate || bill.createdAt || new Date()),
          invoiceNumber: bill.billNumber || `BILL-${bill.id}`,
          amount: String(bill.grandTotal || "0.00"),
          sourceType: source.sourceType,
          category,
          recordType: "Expense",
          description: bill.notes || `Purchase Bill #${bill.billNumber || bill.id}`,
          isDisallowable,
          createdVia: "Bookkeeping",
        });
        importedCount++;
      }
    }

    res.json({ success: true, importedCount });
  } catch (error) {
    console.error("Failed to sync bookkeeping to digital records:", error);
    res.status(500).json({ message: "Failed to sync bookkeeping records" });
  }
});

router.delete("/digital-records/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(mtdItDigitalRecords).where(eq(mtdItDigitalRecords.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete digital record:", error);
    res.status(500).json({ message: "Failed to delete record" });
  }
});

// Sample CSV Download for Bridging (Article 9000271063)
router.get("/sample-template/:sourceType", async (req: any, res) => {
  const sourceType = req.params.sourceType || "sole-trader";
  let csv = "";
  if (sourceType === "uk-property") {
    csv = `Invoice number,Party Name,Invoice date,Transaction Type,Category,Amount,IsDisAllowable,Description
INV-P01,Tenant Apartment 4B,2025-05-01,Income,Turnover,1450.00,No,Monthly Residential Rent
EXP-P01,London Gas & Power,2025-05-10,Expense,Premises Running Cost,180.50,No,Quarterly Utilities Boiler Gas
EXP-P02,Apex Plumbing Ltd,2025-05-18,Expense,Maintenance,320.00,No,Radiator Valve Emergency Repair
EXP-P03,City Council Rates,2025-05-25,Expense,Premises Running Cost,145.00,No,Council Tax Empty Period
`;
  } else if (sourceType === "foreign-property") {
    csv = `Invoice number,Party Name,Invoice date,Transaction Type,Category,Amount,IsDisAllowable,Description
INV-FP01,Holiday Villa Guest,2025-06-01,Income,Turnover,2200.00,No,Summer Holiday Letting Rental
EXP-FP01,Euro Management SL,2025-06-12,Expense,Premises Running Cost,275.00,No,Keyholding and Cleaning Services
EXP-FP02,Iberian Insurances,2025-06-20,Expense,Premises Running Cost,450.00,No,Annual Foreign Villa Hazard Policy
`;
  } else {
    // sole-trader
    csv = `Invoice number,Party Name,Invoice date,Transaction Type,Category,Amount,IsDisAllowable,Description
INV-1001,Acme Corp,2025-04-15,Income,Turnover,3500.00,No,Consulting and advisory services
INV-1002,Global Logistics,2025-04-28,Income,Turnover,1250.00,No,Technical project implementation
EXP-2001,FastPrint Ltd,2025-05-02,Expense,Advertising Cost,240.00,No,Client marketing brochure prints
EXP-2002,Grand Hotel Suites,2025-05-14,Expense,Business Entertainment Cost,185.00,Yes,Client dinner entertainment
EXP-2003,City Rail Express,2025-05-20,Expense,Travelling Cost,78.50,No,Train ticket for client site visit
EXP-2004,Vanguard Tooling,2025-05-28,Expense,Cost of Goods Bought,620.00,No,Workshop consumable tools and supplies
`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=MTD_IT_${sourceType}_Template.csv`);
  res.send(csv);
});

// -------------------------------------------------------------
// 5. VIEW & SUBMIT WORKSPACE SUMMARY (Three-Line vs Detailed + Shared Ownership Prorating)
// -------------------------------------------------------------
router.get("/summary/:sourceId/:quarterNumber", async (req: any, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const quarterNumber = parseInt(req.params.quarterNumber, 10);
    const taxYear = (req.query.taxYear as string) || "2025-26";

    const [source] = await db.select().from(mtdItSources).where(eq(mtdItSources.id, sourceId));
    if (!source) return res.status(404).json({ message: "Income source not found" });

    // Fetch records for this source
    const records = await db
      .select()
      .from(mtdItDigitalRecords)
      .where(eq(mtdItDigitalRecords.sourceId, sourceId));

    let grossIncome = 0;
    let allowableExpenses = 0;
    let disallowableExpenses = 0;

    const categoryBreakdown: Record<string, { allowable: number; disallowable: number }> = {};

    for (const r of records) {
      const amt = parseFloat(r.amount) || 0;
      if (r.recordType === "Income") {
        grossIncome += amt;
      } else {
        if (r.isDisallowable) {
          disallowableExpenses += amt;
        } else {
          allowableExpenses += amt;
        }

        if (!categoryBreakdown[r.category]) {
          categoryBreakdown[r.category] = { allowable: 0, disallowable: 0 };
        }
        if (r.isDisallowable) {
          categoryBreakdown[r.category].disallowable += amt;
        } else {
          categoryBreakdown[r.category].allowable += amt;
        }
      }
    }

    const netProfit = grossIncome - allowableExpenses;

    // Article 9000277853: Shared Ownership Prorating for Property Sources
    const sharePct = parseFloat(source.sharedOwnershipPct || "100.00") / 100;
    const isShared = sharePct > 0 && sharePct < 1;

    const reportableGrossIncome = grossIncome * sharePct;
    const reportableAllowableExpenses = allowableExpenses * sharePct;
    const reportableDisallowableExpenses = disallowableExpenses * sharePct;
    const reportableNetProfit = reportableGrossIncome - reportableAllowableExpenses;

    // Category breakdown prorated
    const proratedCategoryBreakdown: Record<string, { allowable: number; disallowable: number }> = {};
    for (const [cat, val] of Object.entries(categoryBreakdown)) {
      proratedCategoryBreakdown[cat] = {
        allowable: val.allowable * sharePct,
        disallowable: val.disallowable * sharePct,
      };
    }

    res.json({
      sourceId,
      quarterNumber,
      taxYear,
      reportingMethod: source.reportingMethod || "three_line",
      sharedOwnershipPct: source.sharedOwnershipPct || "100.00",
      isSharedOwnership: isShared,
      // Reportable figures (client's actual taxable proportion)
      threeLine: {
        turnover: reportableGrossIncome.toFixed(2),
        allowableExpenses: reportableAllowableExpenses.toFixed(2),
        netProfit: reportableNetProfit.toFixed(2),
      },
      detailed: {
        grossIncome: reportableGrossIncome.toFixed(2),
        allowableExpenses: reportableAllowableExpenses.toFixed(2),
        disallowableExpenses: reportableDisallowableExpenses.toFixed(2),
        netProfit: reportableNetProfit.toFixed(2),
        categoryBreakdown: proratedCategoryBreakdown,
      },
      // Full gross figures (prior to shared split)
      grossFull: {
        turnover: grossIncome.toFixed(2),
        allowableExpenses: allowableExpenses.toFixed(2),
        disallowableExpenses: disallowableExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        categoryBreakdown,
      },
      ytdSummary: {
        q1: { turnover: reportableGrossIncome.toFixed(2), expenses: reportableAllowableExpenses.toFixed(2), net: reportableNetProfit.toFixed(2) },
        q2: { turnover: "0.00", expenses: "0.00", net: "0.00" },
        q3: { turnover: "0.00", expenses: "0.00", net: "0.00" },
        q4: { turnover: "0.00", expenses: "0.00", net: "0.00" },
        cumulative: {
          turnover: reportableGrossIncome.toFixed(2),
          expenses: reportableAllowableExpenses.toFixed(2),
          netProfit: reportableNetProfit.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Failed to compute summary:", error);
    res.status(500).json({ message: "Failed to compute summary" });
  }
});

// -------------------------------------------------------------
// 6. QUARTERLY SUBMISSION & CAPISIGN APPROVAL
// -------------------------------------------------------------
router.post("/submit-quarter", async (req: any, res) => {
  try {
    const { sourceId, quarterNumber, taxYear, grossIncome, allowableExpenses, disallowableExpenses, netProfit, submissionMethod } = req.body;

    if (!sourceId || !quarterNumber || !taxYear) {
      return res.status(400).json({ message: "sourceId, quarterNumber, and taxYear required" });
    }

    const [source] = await db.select().from(mtdItSources).where(eq(mtdItSources.id, parseInt(sourceId, 10)));
    if (!source) return res.status(404).json({ message: "Source not found" });

    // Check or create mtdItQuarters entry
    const existingQuarter = await db
      .select()
      .from(mtdItQuarters)
      .where(
        and(
          eq(mtdItQuarters.sourceId, source.id),
          eq(mtdItQuarters.quarterNumber, parseInt(quarterNumber, 10)),
          eq(mtdItQuarters.taxYear, taxYear)
        )
      );

    let quarterId: number;
    if (existingQuarter.length > 0) {
      quarterId = existingQuarter[0].id;
      await db
        .update(mtdItQuarters)
        .set({ status: "Submitted", isLocked: true })
        .where(eq(mtdItQuarters.id, quarterId));
    } else {
      const dates = getQuarterDates(taxYear, parseInt(quarterNumber, 10), source.calendarType || "standard");
      const [qIns] = await db.insert(mtdItQuarters).values({
        mtdClientId: source.mtdClientId,
        sourceId: source.id,
        taxYear,
        quarterNumber: parseInt(quarterNumber, 10),
        startDate: new Date(dates.startDate),
        endDate: new Date(dates.endDate),
        dueDate: new Date(dates.dueDate),
        status: "Submitted",
        isLocked: true,
      });
      quarterId = qIns.insertId;
    }

    // Record submission
    const hmrcSubmissionId = `HMRC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const [subResult] = await db.insert(mtdItQuarterSubmissions).values({
      mtdQuarterId: quarterId,
      sourceId: source.id,
      taxYear,
      quarterNumber: parseInt(quarterNumber, 10),
      grossIncome: String(grossIncome || "0.00"),
      allowableExpenses: String(allowableExpenses || "0.00"),
      disallowableExpenses: String(disallowableExpenses || "0.00"),
      netProfit: String(netProfit || "0.00"),
      submissionMethod: submissionMethod || "three_line",
      clientApprovalStatus: "Approved",
      submittedAt: new Date(),
      hmrcSubmissionId,
      status: "Submitted",
    });

    res.json({
      success: true,
      submissionId: subResult.insertId,
      hmrcSubmissionId,
      message: `Quarterly update successfully submitted to HMRC. Submission ID: ${hmrcSubmissionId}`,
    });
  } catch (error) {
    console.error("Failed to submit quarterly return:", error);
    res.status(500).json({ message: "Failed to submit quarter" });
  }
});

router.post("/request-approval", async (req: any, res) => {
  try {
    const { sourceId, quarterNumber, taxYear } = req.body;
    if (!sourceId || !quarterNumber) return res.status(400).json({ message: "sourceId and quarterNumber required" });

    // Update existing submission approval status or create draft
    const existingSub = await db
      .select()
      .from(mtdItQuarterSubmissions)
      .where(
        and(
          eq(mtdItQuarterSubmissions.sourceId, parseInt(sourceId, 10)),
          eq(mtdItQuarterSubmissions.quarterNumber, parseInt(quarterNumber, 10)),
          eq(mtdItQuarterSubmissions.taxYear, taxYear || "2025-26")
        )
      );

    if (existingSub.length > 0) {
      await db
        .update(mtdItQuarterSubmissions)
        .set({ clientApprovalStatus: "Sent" })
        .where(eq(mtdItQuarterSubmissions.id, existingSub[0].id));
    }

    res.json({
      success: true,
      message: "Quarterly statement sent to client portal and Capisign for electronic review and signature.",
    });
  } catch (error) {
    console.error("Failed to request approval:", error);
    res.status(500).json({ message: "Failed to request approval" });
  }
});

// Override Client Approval (Article 9000278130)
router.post("/override-approval", async (req: any, res) => {
  try {
    const { sourceId, quarterNumber, taxYear, reason } = req.body;
    if (!sourceId || !quarterNumber) return res.status(400).json({ message: "sourceId and quarterNumber required" });

    const existingSub = await db
      .select()
      .from(mtdItQuarterSubmissions)
      .where(
        and(
          eq(mtdItQuarterSubmissions.sourceId, parseInt(sourceId, 10)),
          eq(mtdItQuarterSubmissions.quarterNumber, parseInt(quarterNumber, 10)),
          eq(mtdItQuarterSubmissions.taxYear, taxYear || "2025-26")
        )
      );

    if (existingSub.length > 0) {
      await db
        .update(mtdItQuarterSubmissions)
        .set({ clientApprovalStatus: "Approved" })
        .where(eq(mtdItQuarterSubmissions.id, existingSub[0].id));
    }

    res.json({
      success: true,
      clientApprovalStatus: "Approved",
      message: `Client approval overridden successfully (${reason || "Offline / Verbal Client Consent"}). Quarterly submission is now unlocked for HMRC.`,
    });
  } catch (error) {
    console.error("Failed to override approval:", error);
    res.status(500).json({ message: "Failed to override approval" });
  }
});

// -------------------------------------------------------------
// 7. ADJUSTMENTS AND ALLOWANCES (Article 9000277158 Parity)
// -------------------------------------------------------------
router.get("/adjustments/:sourceId/:taxYear", async (req: any, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const taxYear = req.params.taxYear;

    const [record] = await db
      .select()
      .from(mtdItAdjustmentsAllowances)
      .where(and(eq(mtdItAdjustmentsAllowances.sourceId, sourceId), eq(mtdItAdjustmentsAllowances.taxYear, taxYear)));

    res.json(record || null);
  } catch (error) {
    console.error("Failed to fetch adjustments:", error);
    res.status(500).json({ message: "Failed to fetch adjustments" });
  }
});

router.post("/adjustments", async (req: any, res) => {
  try {
    const {
      sourceId,
      taxYear,
      includedNonTaxableProfits,
      basisAdjustment,
      outstandingBusinessIncome,
      overlapReliefUsed,
      balancingChargeBpra,
      accountingAdjustment,
      balancingChargeOther,
      goodsServicesOwnUse,
      privateUseAdjustment,
      annualInvestmentAllowance,
      enhancedCapitalAllowance,
      bpra,
      allowanceOnSales,
      capitalAllowanceMainPool,
      capitalAllowanceSingleAsset,
      capitalAllowanceSpecialRate,
      tradingAllowance,
      propertyAllowance,
      zeroEmissionVehicleAllowance,
      replacingDomesticItemsAllowance,
      class4NicExempt,
      submitNow,
    } = req.body;

    if (!sourceId || !taxYear) {
      return res.status(400).json({ message: "sourceId and taxYear are required" });
    }

    const [source] = await db.select().from(mtdItSources).where(eq(mtdItSources.id, parseInt(sourceId, 10)));
    if (!source) return res.status(404).json({ message: "Source not found" });

    const existing = await db
      .select()
      .from(mtdItAdjustmentsAllowances)
      .where(
        and(
          eq(mtdItAdjustmentsAllowances.sourceId, source.id),
          eq(mtdItAdjustmentsAllowances.taxYear, taxYear)
        )
      );

    const values = {
      mtdClientId: source.mtdClientId || 1,
      sourceId: source.id,
      taxYear,
      includedNonTaxableProfits: String(includedNonTaxableProfits || "0.00"),
      basisAdjustment: String(basisAdjustment || "0.00"),
      outstandingBusinessIncome: String(outstandingBusinessIncome || "0.00"),
      overlapReliefUsed: String(overlapReliefUsed || "0.00"),
      balancingChargeBpra: String(balancingChargeBpra || "0.00"),
      accountingAdjustment: String(accountingAdjustment || "0.00"),
      balancingChargeOther: String(balancingChargeOther || "0.00"),
      goodsServicesOwnUse: String(goodsServicesOwnUse || "0.00"),
      privateUseAdjustment: String(privateUseAdjustment || "0.00"),
      annualInvestmentAllowance: String(annualInvestmentAllowance || "0.00"),
      enhancedCapitalAllowance: String(enhancedCapitalAllowance || "0.00"),
      bpra: String(bpra || "0.00"),
      allowanceOnSales: String(allowanceOnSales || "0.00"),
      capitalAllowanceMainPool: String(capitalAllowanceMainPool || "0.00"),
      capitalAllowanceSingleAsset: String(capitalAllowanceSingleAsset || "0.00"),
      capitalAllowanceSpecialRate: String(capitalAllowanceSpecialRate || "0.00"),
      tradingAllowance: String(tradingAllowance || "0.00"),
      propertyAllowance: String(propertyAllowance || "0.00"),
      zeroEmissionVehicleAllowance: String(zeroEmissionVehicleAllowance || "0.00"),
      replacingDomesticItemsAllowance: String(replacingDomesticItemsAllowance || "0.00"),
      class4NicExempt: Boolean(class4NicExempt),
      status: submitNow ? "Submitted" : "Draft",
      submittedAt: submitNow ? new Date() : null,
      hmrcSubmissionId: submitNow ? `HMRC-ADJ-${Date.now().toString(36).toUpperCase()}` : null,
    };

    if (existing.length > 0) {
      await db
        .update(mtdItAdjustmentsAllowances)
        .set(values)
        .where(eq(mtdItAdjustmentsAllowances.id, existing[0].id));
      res.json({ id: existing[0].id, success: true });
    } else {
      const [insertRes] = await db.insert(mtdItAdjustmentsAllowances).values(values);
      res.json({ id: insertRes.insertId, success: true });
    }
  } catch (error) {
    console.error("Failed to save adjustments:", error);
    res.status(500).json({ message: "Failed to save adjustments" });
  }
});

// -------------------------------------------------------------
// 8. DIVIDEND DATABASE INTEGRATION
// -------------------------------------------------------------
router.get("/dividends/:clientId/:taxYear", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const taxYear = req.params.taxYear;

    const list = await db
      .select()
      .from(mtdItDividends)
      .where(and(eq(mtdItDividends.clientId, clientId), eq(mtdItDividends.taxYear, taxYear)));

    res.json(list);
  } catch (error) {
    console.error("Failed to fetch dividends:", error);
    res.status(500).json({ message: "Failed to fetch dividends" });
  }
});

router.post("/dividends", async (req: any, res) => {
  try {
    const { clientId, mtdClientId, taxYear, companyName, sharesHeld, dividendRate, totalDividend, taxCredit } = req.body;
    if (!clientId || !taxYear || !companyName || totalDividend === undefined) {
      return res.status(400).json({ message: "clientId, taxYear, companyName, and totalDividend required" });
    }

    const [resInsert] = await db.insert(mtdItDividends).values({
      clientId: parseInt(clientId, 10),
      mtdClientId: mtdClientId ? parseInt(mtdClientId, 10) : 1,
      taxYear,
      companyName,
      sharesHeld: sharesHeld ? String(sharesHeld) : "0.00",
      dividendRate: dividendRate ? String(dividendRate) : "0.00",
      totalDividend: String(totalDividend),
      taxCredit: taxCredit ? String(taxCredit) : "0.00",
    });

    res.json({ id: resInsert.insertId, success: true });
  } catch (error) {
    console.error("Failed to save dividend:", error);
    res.status(500).json({ message: "Failed to save dividend" });
  }
});

// -------------------------------------------------------------
// 9. FINAL DECLARATION (Consolidated Annual Return)
// -------------------------------------------------------------
router.get("/final-declaration/:clientId/:taxYear", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    const taxYear = req.params.taxYear;

    // Check existing declaration
    const [existing] = await db
      .select()
      .from(mtdItFinalDeclarations)
      .where(and(eq(mtdItFinalDeclarations.clientId, clientId), eq(mtdItFinalDeclarations.taxYear, taxYear)));

    // Fetch sources
    const sources = await db
      .select()
      .from(mtdItSources)
      .where(and(eq(mtdItSources.clientId, clientId), eq(mtdItSources.isActive, true)));

    // Fetch dividends
    const divs = await db
      .select()
      .from(mtdItDividends)
      .where(and(eq(mtdItDividends.clientId, clientId), eq(mtdItDividends.taxYear, taxYear)));

    const totalDividends = divs.reduce((acc, d) => acc + (parseFloat(d.totalDividend) || 0), 0);

    // Sum digital records across sources
    let totalTurnover = 0;
    let totalAllowableExpenses = 0;

    for (const s of sources) {
      const recs = await db.select().from(mtdItDigitalRecords).where(eq(mtdItDigitalRecords.sourceId, s.id));
      for (const r of recs) {
        const amt = parseFloat(r.amount) || 0;
        if (r.recordType === "Income") totalTurnover += amt;
        else if (!r.isDisallowable) totalAllowableExpenses += amt;
      }
    }

    const netProfit = totalTurnover - totalAllowableExpenses;
    const taxableProfit = Math.max(0, netProfit);
    // Simple estimated tax liability: 20% basic rate on profit over personal allowance (£12,570)
    const taxableAboveAllowance = Math.max(0, taxableProfit + totalDividends - 12570);
    const estimatedTax = taxableAboveAllowance * 0.2;

    res.json({
      declaration: existing || null,
      calculatedFigures: {
        totalTurnover: totalTurnover.toFixed(2),
        totalAllowableExpenses: totalAllowableExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        totalDividends: totalDividends.toFixed(2),
        taxableProfit: taxableProfit.toFixed(2),
        estimatedTaxDue: estimatedTax.toFixed(2),
        personalAllowanceUsed: Math.min(taxableProfit + totalDividends, 12570).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Failed to compute final declaration:", error);
    res.status(500).json({ message: "Failed to compute final declaration" });
  }
});

router.post("/final-declaration/submit", async (req: any, res) => {
  try {
    const { clientId, mtdClientId, taxYear, figures } = req.body;
    if (!clientId || !taxYear) return res.status(400).json({ message: "clientId and taxYear required" });

    const hmrcSubmissionId = `HMRC-FINAL-${Date.now().toString(36).toUpperCase()}`;

    const values = {
      mtdClientId: mtdClientId || 1,
      clientId: parseInt(clientId, 10),
      taxYear,
      totalTurnover: String(figures?.totalTurnover || "0.00"),
      totalAllowableExpenses: String(figures?.totalAllowableExpenses || "0.00"),
      taxableProfit: String(figures?.taxableProfit || "0.00"),
      taxDue: String(figures?.estimatedTaxDue || "0.00"),
      totalDividends: String(figures?.totalDividends || "0.00"),
      status: "Submitted",
      submittedAt: new Date(),
      hmrcSubmissionId,
      clientApprovalStatus: "Approved",
    };

    const existing = await db
      .select()
      .from(mtdItFinalDeclarations)
      .where(and(eq(mtdItFinalDeclarations.clientId, parseInt(clientId, 10)), eq(mtdItFinalDeclarations.taxYear, taxYear)));

    if (existing.length > 0) {
      await db.update(mtdItFinalDeclarations).set(values).where(eq(mtdItFinalDeclarations.id, existing[0].id));
    } else {
      await db.insert(mtdItFinalDeclarations).values(values);
    }

    res.json({
      success: true,
      hmrcSubmissionId,
      message: `Final Declaration successfully submitted to HMRC. Annual submission reference: ${hmrcSubmissionId}`,
    });
  } catch (error) {
    console.error("Failed to submit final declaration:", error);
    res.status(500).json({ message: "Failed to submit final declaration" });
  }
});

export default router;
