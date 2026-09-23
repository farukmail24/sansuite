import { Router } from "express";
import { db } from "../db";
import { pmServices, pmServiceSteps, pmClientServices, clients, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// --- MASTER SERVICES CATALOG ---

// Seed statutory services if none exist for this practice
async function ensureDefaultServices(practiceId: number) {
  const existing = await db.select().from(pmServices).where(eq(pmServices.practiceId, practiceId)).limit(1);
  if (existing.length === 0) {
    const defaults = [
      {
        practiceId,
        serviceCode: "ACC_PROD",
        serviceName: "Accounts Production",
        serviceCategory: "Compliance",
        description: "Statutory annual accounts for Companies House & HMRC (FRS 102/105).",
        isStatutory: true,
        defaultBillingFrequency: "Annually",
        defaultFee: "750.00",
        steps: [
          { stepName: "Request Year-End Documents & Trial Balance", stepOrder: 1, daysBeforeDeadline: 90 },
          { stepName: "Reconcile Bank, Sales, & Purchases", stepOrder: 2, daysBeforeDeadline: 60 },
          { stepName: "Draft Full & Abridged Accounts", stepOrder: 3, daysBeforeDeadline: 30 },
          { stepName: "Manager Quality Review", stepOrder: 4, daysBeforeDeadline: 14 },
          { stepName: "Send for Client E-Signature", stepOrder: 5, daysBeforeDeadline: 7 },
          { stepName: "Submit to Companies House & HMRC", stepOrder: 6, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "CT600",
        serviceName: "Corporation Tax Return",
        serviceCategory: "Tax",
        description: "Company tax computations, capital allowances, and CT600 return filing.",
        isStatutory: true,
        defaultBillingFrequency: "Annually",
        defaultFee: "450.00",
        steps: [
          { stepName: "Extract Taxable Profit from Accounts", stepOrder: 1, daysBeforeDeadline: 60 },
          { stepName: "Compute Capital Allowances & Loss Relief", stepOrder: 2, daysBeforeDeadline: 30 },
          { stepName: "Generate CT600 & Computation Schedule", stepOrder: 3, daysBeforeDeadline: 14 },
          { stepName: "Client Approval & HMRC Online Submission", stepOrder: 4, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "VAT_RET",
        serviceName: "VAT Returns (MTD)",
        serviceCategory: "Compliance",
        description: "Quarterly MTD VAT return reconciliation, calculation, and HMRC submission.",
        isStatutory: true,
        defaultBillingFrequency: "Quarterly",
        defaultFee: "150.00",
        steps: [
          { stepName: "Reconcile Quarter Sales & Purchase Invoices", stepOrder: 1, daysBeforeDeadline: 20 },
          { stepName: "Review Box 1 to Box 9 Calculations", stepOrder: 2, daysBeforeDeadline: 10 },
          { stepName: "Client Approval & HMRC MTD Filing", stepOrder: 3, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "SA100",
        serviceName: "Self Assessment Tax Return",
        serviceCategory: "Tax",
        description: "Personal tax return for directors, sole traders, and high earners.",
        isStatutory: true,
        defaultBillingFrequency: "Annually",
        defaultFee: "250.00",
        steps: [
          { stepName: "Collate P60, Dividends & Expense Records", stepOrder: 1, daysBeforeDeadline: 60 },
          { stepName: "Calculate Tax Liability & Payment on Account", stepOrder: 2, daysBeforeDeadline: 20 },
          { stepName: "Client Sign-off & HMRC Submission", stepOrder: 3, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "CS01",
        serviceName: "Confirmation Statement",
        serviceCategory: "Compliance",
        description: "Annual verification of PSCs, officers, share capital, and registered office.",
        isStatutory: true,
        defaultBillingFrequency: "Annually",
        defaultFee: "95.00",
        steps: [
          { stepName: "Verify Officers & Shareholder Register", stepOrder: 1, daysBeforeDeadline: 14 },
          { stepName: "File CS01 with Companies House", stepOrder: 2, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "PAYROLL_MONTHLY",
        serviceName: "Monthly Payroll & RTI",
        serviceCategory: "Payroll",
        description: "Monthly payroll processing, auto-enrolment pensions, and FPS/EPS submission.",
        isStatutory: true,
        defaultBillingFrequency: "Monthly",
        defaultFee: "85.00",
        steps: [
          { stepName: "Collate Timesheets, Overtime & Adjustments", stepOrder: 1, daysBeforeDeadline: 5 },
          { stepName: "Process Pay Run & Generate Payslips", stepOrder: 2, daysBeforeDeadline: 2 },
          { stepName: "Submit RTI FPS to HMRC & Pension Upload", stepOrder: 3, daysBeforeDeadline: 0 },
        ]
      },
      {
        practiceId,
        serviceCode: "BOOKKEEPING",
        serviceName: "Monthly Bookkeeping",
        serviceCategory: "Bookkeeping",
        description: "Bank feed reconciliation, receipts processing, and ledger maintenance.",
        isStatutory: false,
        defaultBillingFrequency: "Monthly",
        defaultFee: "200.00",
        steps: [
          { stepName: "Fetch Bank Transactions & Reconcile", stepOrder: 1, daysBeforeDeadline: 5 },
          { stepName: "Match Invoices, Bills & Expense Receipts", stepOrder: 2, daysBeforeDeadline: 0 },
        ]
      }
    ];

    for (const item of defaults) {
      const { steps, ...serviceData } = item;
      const [res] = await db.insert(pmServices).values(serviceData as any);
      if (steps && steps.length > 0) {
        for (const st of steps) {
          await db.insert(pmServiceSteps).values({
            serviceId: res.insertId,
            stepName: st.stepName,
            stepOrder: st.stepOrder,
            daysBeforeDeadline: st.daysBeforeDeadline,
            assignedRole: "Staff",
            isMandatory: true,
          });
        }
      }
    }
  }
}

// GET /api/pm/services - List all services for practice
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    await ensureDefaultServices(practiceId);

    const services = await db
      .select()
      .from(pmServices)
      .where(and(eq(pmServices.practiceId, practiceId), eq(pmServices.isActive, true)));

    // Fetch steps for all services
    const serviceIds = services.map(s => s.id);
    let allSteps: any[] = [];
    if (serviceIds.length > 0) {
      allSteps = await db.select().from(pmServiceSteps);
    }

    const result = services.map(s => ({
      ...s,
      steps: allSteps.filter(st => st.serviceId === s.id).sort((a, b) => a.stepOrder - b.stepOrder)
    }));

    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch services:", error);
    res.status(500).json({ message: error.message || "Failed to fetch services" });
  }
});

// POST /api/pm/services - Create bespoke service
router.post("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { serviceCode, serviceName, serviceCategory, description, isStatutory, defaultBillingFrequency, defaultFee, steps } = req.body;

    const [resInsert] = await db.insert(pmServices).values({
      practiceId,
      serviceCode: serviceCode || `SRV_${Date.now()}`,
      serviceName,
      serviceCategory: serviceCategory || "Advisory",
      description: description || "",
      isStatutory: isStatutory || false,
      defaultBillingFrequency: defaultBillingFrequency || "Monthly",
      defaultFee: String(defaultFee || "0.00"),
    });

    const newServiceId = resInsert.insertId;

    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        await db.insert(pmServiceSteps).values({
          serviceId: newServiceId,
          stepName: st.stepName || `Step ${i + 1}`,
          stepOrder: i + 1,
          daysBeforeDeadline: parseInt(st.daysBeforeDeadline || 0),
          assignedRole: st.assignedRole || "Staff",
          isMandatory: st.isMandatory !== false,
        });
      }
    }

    const created = await db.select().from(pmServices).where(eq(pmServices.id, newServiceId)).limit(1);
    res.json(created[0]);
  } catch (error: any) {
    console.error("Failed to create service:", error);
    res.status(500).json({ message: error.message || "Failed to create service" });
  }
});

// GET /api/pm/services/client/:clientId - Get assigned services for a client
router.get("/client/:clientId", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientId = parseInt(req.params.clientId);

    const clientServices = await db
      .select({
        id: pmClientServices.id,
        clientId: pmClientServices.clientId,
        serviceId: pmClientServices.serviceId,
        serviceName: pmServices.serviceName,
        serviceCode: pmServices.serviceCode,
        serviceCategory: pmServices.serviceCategory,
        agreedFee: pmClientServices.agreedFee,
        billingFrequency: pmClientServices.billingFrequency,
        billingType: pmClientServices.billingType,
        status: pmClientServices.status,
        startDate: pmClientServices.startDate,
        assignedManagerId: pmClientServices.assignedManagerId,
        assignedStaffId: pmClientServices.assignedStaffId,
        notes: pmClientServices.notes,
      })
      .from(pmClientServices)
      .innerJoin(pmServices, eq(pmClientServices.serviceId, pmServices.id))
      .where(and(eq(pmClientServices.practiceId, practiceId), eq(pmClientServices.clientId, clientId)));

    res.json(clientServices);
  } catch (error: any) {
    console.error("Failed to fetch client services:", error);
    res.status(500).json({ message: error.message || "Failed to fetch client services" });
  }
});

// POST /api/pm/services/client/:clientId - Assign service to client
router.post("/client/:clientId", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientId = parseInt(req.params.clientId);
    const { serviceId, agreedFee, billingFrequency, billingType, assignedManagerId, assignedStaffId, startDate, notes } = req.body;

    // Check if already assigned
    const existing = await db
      .select()
      .from(pmClientServices)
      .where(and(eq(pmClientServices.clientId, clientId), eq(pmClientServices.serviceId, serviceId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pmClientServices)
        .set({
          agreedFee: String(agreedFee || "0.00"),
          billingFrequency: billingFrequency || "Monthly",
          billingType: billingType || "Fixed",
          assignedManagerId: assignedManagerId || null,
          assignedStaffId: assignedStaffId || null,
          startDate: startDate ? new Date(startDate) : undefined,
          status: "Active",
          notes: notes || "",
        })
        .where(eq(pmClientServices.id, existing[0].id));

      return res.json({ message: "Service assignment updated successfully", id: existing[0].id });
    }

    const [insertRes] = await db.insert(pmClientServices).values({
      practiceId,
      clientId,
      serviceId,
      agreedFee: String(agreedFee || "0.00"),
      billingFrequency: billingFrequency || "Monthly",
      billingType: billingType || "Fixed",
      assignedManagerId: assignedManagerId || null,
      assignedStaffId: assignedStaffId || null,
      startDate: startDate ? new Date(startDate) : new Date(),
      status: "Active",
      notes: notes || "",
    });

    res.json({ message: "Service assigned to client successfully", id: insertRes.insertId });
  } catch (error: any) {
    console.error("Failed to assign service:", error);
    res.status(500).json({ message: error.message || "Failed to assign service" });
  }
});

// DELETE /api/pm/services/client-service/:id - Remove assigned service
router.delete("/client-service/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);

    await db
      .delete(pmClientServices)
      .where(and(eq(pmClientServices.id, id), eq(pmClientServices.practiceId, practiceId)));

    res.json({ success: true, message: "Assigned service removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove assigned service" });
  }
});

export default router;
