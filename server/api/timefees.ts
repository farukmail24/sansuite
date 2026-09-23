import { Router } from "express";
import { db } from "../db";
import { 
  jobs, timesheets, clients, users, feesInvoices, expenses,
  timeFeesEstimates, timeFeesSettings, practices 
} from "@shared/schema";
import { eq, and, desc, asc, inArray, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// Helper: Calculate date boundaries from period
function getPeriodDateRange(period?: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }

  if (period === "this_week") {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
  } else if (period === "last_week") {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) - 7;
    start.setDate(diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  } else if (period === "this_month") {
    start.setDate(1);
  } else if (period === "last_month") {
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  } else if (period === "this_quarter") {
    const quarterMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterMonth, 1);
  } else if (period === "last_quarter") {
    const quarterMonth = Math.floor(start.getMonth() / 3) * 3 - 3;
    const qYear = quarterMonth < 0 ? start.getFullYear() - 1 : start.getFullYear();
    const actualQMonth = (quarterMonth + 12) % 12;
    const qStart = new Date(qYear, actualQMonth, 1, 0, 0, 0, 0);
    const qEnd = new Date(qYear, actualQMonth + 3, 0, 23, 59, 59, 999);
    return { startDate: qStart, endDate: qEnd };
  } else if (period === "this_year") {
    start.setMonth(0, 1);
  } else if (period === "last_year") {
    const lyStart = new Date(start.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const lyEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { startDate: lyStart, endDate: lyEnd };
  } else {
    // Default to all
    return null;
  }

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end };
}

// ===========================================================================
// 1. DASHBOARD & ACTION STATION STATS (Capium Article 9000235896)
// ===========================================================================
router.get("/dashboard-stats", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const period = req.query.period as string || "this_month";
    const customStart = req.query.customStart as string;
    const customEnd = req.query.customEnd as string;
    const dateRange = getPeriodDateRange(period, customStart, customEnd);

    // 1. Fetch practice clients & users
    const practiceClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));
    const practiceUsers = await db.select().from(users).where(eq(users.practiceId, practiceId));
    const [practiceSettings] = await db.select().from(timeFeesSettings).where(eq(timeFeesSettings.practiceId, practiceId));

    // 2. Fetch practice timesheets
    const allTimesheets = await db.select({
      id: timesheets.id,
      date: timesheets.date,
      hours: timesheets.hours,
      ratePerHour: timesheets.ratePerHour,
      billable: timesheets.billable,
      status: timesheets.status,
      taskName: timesheets.taskName,
      clientId: timesheets.clientId,
      userId: timesheets.userId,
      userName: users.firstName,
      clientName: clients.clientName,
    })
    .from(timesheets)
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .leftJoin(users, eq(timesheets.userId, users.id))
    .where(eq(timesheets.practiceId, practiceId));
    
    // Filter timesheets by period if specified
    const filteredTimesheets = allTimesheets.filter(t => {
      if (!dateRange) return true;
      const tDate = new Date(t.date);
      return tDate >= dateRange.startDate && tDate <= dateRange.endDate;
    });

    const totalTimeSpent = filteredTimesheets.reduce((sum, t) => sum + parseFloat(t.hours as string || "0"), 0);
    const billableHours = filteredTimesheets.filter(t => t.billable).reduce((sum, t) => sum + parseFloat(t.hours as string || "0"), 0);
    const nonBillableHours = totalTimeSpent - billableHours;
    const billableRatio = totalTimeSpent > 0 ? ((billableHours / totalTimeSpent) * 100).toFixed(1) : "0.0";

    // Capium Time Summary Ratios:
    const clientsWorkedSet = new Set(filteredTimesheets.map(t => t.clientId).filter(Boolean));
    const tasksWorkedSet = new Set(filteredTimesheets.map(t => t.taskName).filter(Boolean));
    const usersWorkedSet = new Set(filteredTimesheets.map(t => t.userId).filter(Boolean));

    const totalPracticeClients = practiceClients.length;
    const totalPracticeUsers = practiceUsers.length || 1;
    const capacityPerUser = parseFloat((practiceSettings?.defaultCapacityHours as string) || "37.5");
    const totalCapacityHours = totalPracticeUsers * capacityPerUser;

    const timeSummary = {
      clientsWorkedOn: clientsWorkedSet.size,
      totalClients: totalPracticeClients,
      tasksWorkedOn: tasksWorkedSet.size,
      totalTasks: Math.max(tasksWorkedSet.size, 16),
      usersWorked: usersWorkedSet.size,
      totalUsers: totalPracticeUsers,
      totalTimeSpent: parseFloat(totalTimeSpent.toFixed(2)),
      totalCapacityHours: parseFloat(totalCapacityHours.toFixed(2)),
      hoursSpentText: `${Math.floor(totalTimeSpent)}h ${Math.round((totalTimeSpent % 1) * 60)}m`,
      capacityText: `${Math.floor(totalCapacityHours)}h 00m`,
    };

    // 3. Capium "Most vs Least by Profit & Working Hours"
    // By Task:
    const taskAgg = new Map<string, { hours: number; profit: number }>();
    filteredTimesheets.forEach(t => {
      const task = t.taskName || "General";
      const h = parseFloat(t.hours as string || "0");
      const r = parseFloat(t.ratePerHour as string || "75");
      const costRate = 35; // Standard cost rate
      const cur = taskAgg.get(task) || { hours: 0, profit: 0 };
      cur.hours += h;
      cur.profit += (t.billable ? h * (r - costRate) : -h * costRate);
      taskAgg.set(task, cur);
    });
    const taskList = Array.from(taskAgg.entries()).map(([name, data]) => ({ name, ...data }));
    const taskByHours = [...taskList].sort((a, b) => b.hours - a.hours);
    const taskByProfit = [...taskList].sort((a, b) => b.profit - a.profit);

    // By Client:
    const clientAgg = new Map<string, { hours: number; profit: number }>();
    filteredTimesheets.forEach(t => {
      const cName = t.clientName || "Unknown Client";
      const h = parseFloat(t.hours as string || "0");
      const r = parseFloat(t.ratePerHour as string || "75");
      const costRate = 35;
      const cur = clientAgg.get(cName) || { hours: 0, profit: 0 };
      cur.hours += h;
      cur.profit += (t.billable ? h * (r - costRate) : -h * costRate);
      clientAgg.set(cName, cur);
    });
    const clientPerfList = Array.from(clientAgg.entries()).map(([name, data]) => ({ name, ...data }));
    const clientByHours = [...clientPerfList].sort((a, b) => b.hours - a.hours);
    const clientByProfit = [...clientPerfList].sort((a, b) => b.profit - a.profit);

    // By User:
    const userAgg = new Map<string, { hours: number; profit: number }>();
    filteredTimesheets.forEach(t => {
      const uName = t.userName || "Staff Member";
      const h = parseFloat(t.hours as string || "0");
      const r = parseFloat(t.ratePerHour as string || "75");
      const costRate = 35;
      const cur = userAgg.get(uName) || { hours: 0, profit: 0 };
      cur.hours += h;
      cur.profit += (t.billable ? h * (r - costRate) : -h * costRate);
      userAgg.set(uName, cur);
    });
    const userPerfList = Array.from(userAgg.entries()).map(([name, data]) => ({ name, ...data }));
    const userByHours = [...userPerfList].sort((a, b) => b.hours - a.hours);
    const userByProfit = [...userPerfList].sort((a, b) => b.profit - a.profit);

    const mostVsLeast = {
      task: {
        mostHours: taskByHours[0] ? { name: taskByHours[0].name, hours: `${taskByHours[0].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        leastHours: taskByHours.length > 1 ? { name: taskByHours[taskByHours.length - 1].name, hours: `${taskByHours[taskByHours.length - 1].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        mostProfit: taskByProfit[0] ? { name: taskByProfit[0].name, amount: `£${taskByProfit[0].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
        leastProfit: taskByProfit.length > 1 ? { name: taskByProfit[taskByProfit.length - 1].name, amount: `£${taskByProfit[taskByProfit.length - 1].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
      },
      client: {
        mostHours: clientByHours[0] ? { name: clientByHours[0].name, hours: `${clientByHours[0].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        leastHours: clientByHours.length > 1 ? { name: clientByHours[clientByHours.length - 1].name, hours: `${clientByHours[clientByHours.length - 1].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        mostProfit: clientByProfit[0] ? { name: clientByProfit[0].name, amount: `£${clientByProfit[0].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
        leastProfit: clientByProfit.length > 1 ? { name: clientByProfit[clientByProfit.length - 1].name, amount: `£${clientByProfit[clientByProfit.length - 1].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
      },
      user: {
        mostHours: userByHours[0] ? { name: userByHours[0].name, hours: `${userByHours[0].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        leastHours: userByHours.length > 1 ? { name: userByHours[userByHours.length - 1].name, hours: `${userByHours[userByHours.length - 1].hours.toFixed(1)}h` } : { name: "N/A", hours: "0h" },
        mostProfit: userByProfit[0] ? { name: userByProfit[0].name, amount: `£${userByProfit[0].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
        leastProfit: userByProfit.length > 1 ? { name: userByProfit[userByProfit.length - 1].name, amount: `£${userByProfit[userByProfit.length - 1].profit.toFixed(2)}` } : { name: "N/A", amount: "£0.00" },
      }
    };

    // 4. Daily Hours Breakdown (Mon-Sun for Task Wise Hours Details Chart)
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyHours = daysOfWeek.map((dayName, idx) => {
      // Find timesheets logged on this day of week (1=Mon ... 0=Sun)
      const targetDay = (idx + 1) % 7;
      const dayLogs = filteredTimesheets.filter(t => new Date(t.date).getDay() === targetDay);
      const bHours = dayLogs.filter(t => t.billable).reduce((sum, t) => sum + parseFloat(t.hours as string || "0"), 0);
      const nbHours = dayLogs.filter(t => !t.billable).reduce((sum, t) => sum + parseFloat(t.hours as string || "0"), 0);
      return {
        day: dayName,
        billable: parseFloat(bHours.toFixed(2)),
        nonBillable: parseFloat(nbHours.toFixed(2)),
        total: parseFloat((bHours + nbHours).toFixed(2)),
      };
    });

    // 5. Fetch jobs
    const allJobs = await db.select().from(jobs).where(eq(jobs.practiceId, practiceId));
    const activeJobs = allJobs.filter(j => j.status === "Active" || j.status === "In Progress");
    const completedJobs = allJobs.filter(j => j.status === "Completed");
    const onHoldJobs = allJobs.filter(j => j.status === "On Hold" || j.status === "OnHold");
    const reviewJobs = allJobs.filter(j => j.status === "Review");

    // 6. Fetch invoices
    const allInvoices = await db.select().from(feesInvoices).where(eq(feesInvoices.practiceId, practiceId));
    const filteredInvoices = allInvoices.filter(inv => {
      if (!dateRange) return true;
      const invDate = new Date(inv.date);
      return invDate >= dateRange.startDate && invDate <= dateRange.endDate;
    });

    const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount as string || "0"), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount as string || "0"), 0);
    const totalDue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.dueAmount as string || (inv.status !== "Paid" ? inv.totalAmount : "0") as string || "0"), 0);

    // 7. Top 5 Clients by Invoiced Amount & Balance
    const clientMap = new Map<number, { name: string; invoiced: number; balance: number }>();
    practiceClients.forEach(c => clientMap.set(c.id, { name: c.clientName, invoiced: 0, balance: 0 }));

    allInvoices.forEach(inv => {
      const rec = clientMap.get(inv.clientId);
      if (rec) {
        rec.invoiced += parseFloat(inv.totalAmount as string || "0");
        const due = parseFloat(inv.dueAmount as string || (inv.status !== "Paid" ? inv.totalAmount : "0") as string || "0");
        rec.balance += due;
      }
    });

    const clientsList = Array.from(clientMap.values());
    const topClientsByRevenue = [...clientsList].sort((a, b) => b.invoiced - a.invoiced).slice(0, 5);
    const topClientsWithBalance = [...clientsList].filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);

    // 8. Monthly Income Trend (Last 6 Months)
    const incomeTrend: { month: string; invoiced: number; paid: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = `${monthNames[mIdx]} ${yr.toString().slice(-2)}`;

      const mInvoices = allInvoices.filter(inv => {
        const idate = new Date(inv.date);
        return idate.getMonth() === mIdx && idate.getFullYear() === yr;
      });

      const invSum = mInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount as string || "0"), 0);
      const paidSum = mInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount as string || "0"), 0);

      incomeTrend.push({ month: label, invoiced: parseFloat(invSum.toFixed(2)), paid: parseFloat(paidSum.toFixed(2)) });
    }

    // 9. Action Station Operational Alerts:
    const pendingTimesheetsCount = allTimesheets.filter(t => t.status === "PFA").length;
    const practiceExpenses = await db.select().from(expenses).where(eq(expenses.practiceId, practiceId));
    const pendingExpensesCount = practiceExpenses.filter(e => e.status === "PFA").length;
    
    const overdueInvoices = allInvoices.filter(i => {
      if (i.status === "Paid") return false;
      const due = i.dueDate ? new Date(i.dueDate) : new Date(i.date);
      return due < today;
    });

    const practiceEstimates = await db.select().from(timeFeesEstimates).where(eq(timeFeesEstimates.practiceId, practiceId));
    const pendingEstimatesCount = practiceEstimates.filter(e => e.status === "Sent").length;
    const acceptedEstimatesCount = practiceEstimates.filter(e => e.status === "Accepted").length;

    const operationalAlerts = {
      pendingTimesheets: pendingTimesheetsCount,
      pendingExpenses: pendingExpensesCount,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesAmount: overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.dueAmount as string || inv.totalAmount as string || "0"), 0),
      pendingEstimates: pendingEstimatesCount,
      acceptedEstimates: acceptedEstimatesCount,
    };

    // 10. Estimates Summary:
    const estimatesSummary = {
      draft: practiceEstimates.filter(e => e.status === "Draft").length,
      sent: practiceEstimates.filter(e => e.status === "Sent").length,
      accepted: practiceEstimates.filter(e => e.status === "Accepted").length,
      converted: practiceEstimates.filter(e => e.status === "Converted").length,
      totalValue: practiceEstimates.reduce((sum, e) => sum + parseFloat(e.totalAmount as string || "0"), 0),
    };

    res.json({
      timeSummary,
      mostVsLeast,
      dailyHours,
      operationalAlerts,
      estimatesSummary,
      totalTimeSpent: parseFloat(totalTimeSpent.toFixed(2)),
      billableHours: parseFloat(billableHours.toFixed(2)),
      nonBillableHours: parseFloat(nonBillableHours.toFixed(2)),
      billableRatio,
      activeJobsCount: activeJobs.length,
      completedJobsCount: completedJobs.length,
      onHoldJobsCount: onHoldJobs.length,
      jobStatusCounts: {
        active: activeJobs.length,
        inProgress: allJobs.filter(j => j.status === "In Progress").length,
        completed: completedJobs.length,
        onHold: onHoldJobs.length,
        review: reviewJobs.length,
        total: allJobs.length,
      },
      totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      topClientsByRevenue,
      topClientsWithBalance,
      incomeTrend,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
  }
});

// ===========================================================================
// 2. TIME & TIMESHEETS WITH PFA APPROVAL WORKFLOW (Articles 9000235910 & 9000235915)
// ===========================================================================
router.get("/timesheets", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { status, clientId, userId, period } = req.query;

    const result = await db.select({
      id: timesheets.id,
      date: timesheets.date,
      hours: timesheets.hours,
      billable: timesheets.billable,
      ratePerHour: timesheets.ratePerHour,
      costRate: timesheets.costRate,
      taskName: timesheets.taskName,
      subtaskName: timesheets.subtaskName,
      description: timesheets.description,
      status: timesheets.status,
      approvedAt: timesheets.approvedAt,
      rejectionReason: timesheets.rejectionReason,
      jobId: timesheets.jobId,
      jobName: jobs.jobName,
      clientId: timesheets.clientId,
      clientName: clients.clientName,
      userId: timesheets.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(timesheets)
    .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .leftJoin(users, eq(timesheets.userId, users.id))
    .where(eq(timesheets.practiceId, practiceId))
    .orderBy(desc(timesheets.date), desc(timesheets.id));

    let filtered = result;
    if (status && status !== "All") {
      filtered = filtered.filter(t => t.status?.toLowerCase() === (status as string).toLowerCase());
    }
    if (clientId && clientId !== "All") {
      filtered = filtered.filter(t => t.clientId === parseInt(clientId as string));
    }
    if (userId && userId !== "All") {
      filtered = filtered.filter(t => t.userId === parseInt(userId as string));
    }

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch timesheets", error: error.message });
  }
});

router.post("/timesheets", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.body.userId ? parseInt(req.body.userId) : req.user.id;
    const { 
      date, hours, billable, ratePerHour, costRate, taskName, subtaskName, 
      description, jobId, clientId, status = "Unsubmitted" 
    } = req.body;

    if (!date || !hours) {
      return res.status(400).json({ message: "Date and hours are required" });
    }

    const [result] = await db.insert(timesheets).values({
      practiceId,
      userId,
      clientId: clientId ? parseInt(clientId) : null,
      jobId: jobId ? parseInt(jobId) : null,
      date: new Date(date),
      hours: (parseFloat(hours)).toFixed(2),
      billable: billable !== undefined ? !!billable : true,
      ratePerHour: ratePerHour ? parseFloat(ratePerHour).toFixed(2) : "85.00",
      costRate: costRate ? parseFloat(costRate).toFixed(2) : "40.00",
      taskName: taskName || "General Accounting",
      subtaskName: subtaskName || undefined,
      description: description || "Accounting and compliance service work",
      status: status || "Unsubmitted",
    });

    res.json({ id: result.insertId, message: "Time logged successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create timesheet entry", error: error.message });
  }
});

// Submit for Approval (Moves Unsubmitted -> PFA)
router.post("/timesheets/submit-pfa", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "List of timesheet IDs is required" });
    }

    for (const id of ids) {
      await db.update(timesheets).set({ status: "PFA" }).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    }

    res.json({ message: `${ids.length} timesheet entry/entries submitted for approval (PFA)` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to submit timesheets for approval", error: error.message });
  }
});

// Bulk/Single Approve (Moves PFA -> Approved)
router.post("/timesheets/approve", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const approverId = req.user.id;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "List of timesheet IDs is required" });
    }

    for (const id of ids) {
      await db.update(timesheets).set({ 
        status: "Approved", 
        approvedBy: approverId, 
        approvedAt: new Date(),
        rejectionReason: null
      }).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    }

    res.json({ message: `${ids.length} timesheet entry/entries approved successfully` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to approve timesheets", error: error.message });
  }
});

// Bulk/Single Reject (Moves PFA -> Rejected with Reason)
router.post("/timesheets/reject", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "List of timesheet IDs is required" });
    }

    for (const id of ids) {
      await db.update(timesheets).set({ 
        status: "Rejected", 
        rejectionReason: reason || "Requires revision"
      }).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    }

    res.json({ message: `${ids.length} timesheet entry/entries rejected` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to reject timesheets", error: error.message });
  }
});

// Withdraw Approval or Rejection (Returns to Unsubmitted)
router.post("/timesheets/withdraw", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "List of timesheet IDs is required" });
    }

    for (const id of ids) {
      await db.update(timesheets).set({ 
        status: "Unsubmitted", 
        approvedBy: null, 
        approvedAt: null,
        rejectionReason: null 
      }).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    }

    res.json({ message: `${ids.length} timesheet entry/entries reverted to Unsubmitted` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to withdraw timesheets", error: error.message });
  }
});

// Copy Previous Week Tasks (Capium Article 9000235910)
router.post("/timesheets/copy-week", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const { currentWeekDate } = req.body;

    const targetDate = currentWeekDate ? new Date(currentWeekDate) : new Date();
    const prevWeekStart = new Date(targetDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    prevWeekStart.setHours(0, 0, 0, 0);

    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    prevWeekEnd.setHours(23, 59, 59, 999);

    const prevEntries = await db.select().from(timesheets).where(
      and(
        eq(timesheets.practiceId, practiceId),
        eq(timesheets.userId, userId),
        gte(timesheets.date, prevWeekStart),
        lte(timesheets.date, prevWeekEnd)
      )
    );

    if (prevEntries.length === 0) {
      return res.status(400).json({ message: "No entries found in the previous week to copy." });
    }

    let copiedCount = 0;
    for (const entry of prevEntries) {
      const newEntryDate = new Date(entry.date);
      newEntryDate.setDate(newEntryDate.getDate() + 7);

      await db.insert(timesheets).values({
        practiceId,
        userId,
        clientId: entry.clientId,
        jobId: entry.jobId,
        date: newEntryDate,
        hours: entry.hours,
        billable: entry.billable,
        ratePerHour: entry.ratePerHour,
        costRate: entry.costRate,
        taskName: entry.taskName,
        subtaskName: entry.subtaskName,
        description: entry.description,
        status: "Unsubmitted",
      });
      copiedCount++;
    }

    res.json({ message: `Successfully copied ${copiedCount} task(s) into this week.` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to copy tasks", error: error.message });
  }
});

router.patch("/timesheets/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    const updates = { ...req.body };
    if (updates.date) updates.date = new Date(updates.date);

    await db.update(timesheets).set(updates).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    res.json({ message: "Timesheet entry updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update timesheet", error: error.message });
  }
});

router.delete("/timesheets/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);

    await db.delete(timesheets).where(and(eq(timesheets.id, id), eq(timesheets.practiceId, practiceId)));
    res.json({ message: "Timesheet entry deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete timesheet", error: error.message });
  }
});

// ===========================================================================
// 3. JOBS MANAGEMENT (Capium Article 9000235917 - 8-Area Job Workspace)
// ===========================================================================
router.get("/jobs", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const rawJobs = await db.select({
      id: jobs.id,
      jobName: jobs.jobName,
      description: jobs.description,
      feeType: jobs.feeType,
      taskType: jobs.taskType,
      budget: jobs.budget,
      status: jobs.status,
      startDate: jobs.startDate,
      targetEndDate: jobs.targetEndDate,
      estimatedHours: jobs.estimatedHours,
      assignedTo: jobs.assignedTo,
      roi: jobs.roi,
      subtasksJson: jobs.subtasksJson,
      recurringSchedule: jobs.recurringSchedule,
      clientId: jobs.clientId,
      clientName: clients.clientName,
      assigneeFirstName: users.firstName,
      assigneeLastName: users.lastName,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .where(eq(jobs.practiceId, practiceId))
    .orderBy(desc(jobs.id));

    // Calculate logged hours per job
    const allTimesheets = await db.select().from(timesheets).where(eq(timesheets.practiceId, practiceId));
    
    const enriched = rawJobs.map(j => {
      const jobTimesheets = allTimesheets.filter(t => t.jobId === j.id);
      const actualHours = jobTimesheets.reduce((acc, t) => acc + parseFloat(t.hours as string || "0"), 0);
      const billableAmount = jobTimesheets.filter(t => t.billable).reduce((acc, t) => acc + (parseFloat(t.hours as string || "0") * parseFloat(t.ratePerHour as string || "85")), 0);
      const staffCost = jobTimesheets.reduce((acc, t) => acc + (parseFloat(t.hours as string || "0") * parseFloat(t.costRate as string || "40")), 0);
      const calculatedRoi = staffCost > 0 ? (((billableAmount - staffCost) / staffCost) * 100).toFixed(1) : "0.0";

      return {
        ...j,
        actualHours: parseFloat(actualHours.toFixed(2)),
        billableAmount: parseFloat(billableAmount.toFixed(2)),
        staffCost: parseFloat(staffCost.toFixed(2)),
        roi: calculatedRoi,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch jobs", error: error.message });
  }
});

router.get("/jobs/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const jobId = parseInt(req.params.id);

    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.practiceId, practiceId)));
    if (!job) return res.status(404).json({ message: "Job not found" });

    const [client] = await db.select().from(clients).where(eq(clients.id, job.clientId || 0));
    const jobTimesheets = await db.select().from(timesheets).where(and(eq(timesheets.jobId, jobId), eq(timesheets.practiceId, practiceId))).orderBy(desc(timesheets.date));
    const jobInvoices = await db.select().from(feesInvoices).where(and(eq(feesInvoices.clientId, job.clientId || 0), eq(feesInvoices.practiceId, practiceId)));

    res.json({
      job,
      client: client || null,
      timelogs: jobTimesheets,
      invoices: jobInvoices,
      comments: job.commentsJson || [],
      files: job.filesJson || [],
      activity: job.activityLogJson || [],
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch job details", error: error.message });
  }
});

router.post("/jobs", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { 
      jobName, description, feeType, taskType, budget, startDate, 
      targetEndDate, estimatedHours, assignedTo, clientId, subtasks 
    } = req.body;

    if (!jobName || !clientId) {
      return res.status(400).json({ message: "Job Name and Client are required" });
    }

    const defaultSubtasks = subtasks || [
      { id: 1, name: "Initial document review", estimatedHours: "2.00", billableRate: "85.00", costRate: "40.00", status: "Pending" },
      { id: 2, name: "Reconciliation & analysis", estimatedHours: "4.00", billableRate: "85.00", costRate: "40.00", status: "Pending" },
      { id: 3, name: "Final review & statutory submission", estimatedHours: "2.00", billableRate: "120.00", costRate: "50.00", status: "Pending" }
    ];

    const initialActivity = [
      { id: 1, action: "Job Created", details: `Created job '${jobName}'`, timestamp: new Date(), user: req.user.email }
    ];

    const [result] = await db.insert(jobs).values({
      practiceId,
      clientId: parseInt(clientId),
      jobName,
      description: description || undefined,
      feeType: feeType || "Hourly",
      taskType: taskType || "Accounting & Compliance",
      budget: budget ? parseFloat(budget).toFixed(2) : "0.00",
      status: "Active",
      startDate: startDate ? new Date(startDate) : new Date(),
      targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours).toFixed(2) : "8.00",
      assignedTo: assignedTo ? parseInt(assignedTo) : req.user.id,
      subtasksJson: defaultSubtasks,
      activityLogJson: initialActivity,
    });

    res.json({ id: result.insertId, message: "Job created successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create job", error: error.message });
  }
});

router.patch("/jobs/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const jobId = parseInt(req.params.id);
    const updates = { ...req.body };

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.targetEndDate) updates.targetEndDate = new Date(updates.targetEndDate);

    await db.update(jobs).set(updates).where(and(eq(jobs.id, jobId), eq(jobs.practiceId, practiceId)));
    res.json({ message: "Job updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update job", error: error.message });
  }
});

// Add comment to job
router.post("/jobs/:id/comment", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const jobId = parseInt(req.params.id);
    const { comment } = req.body;

    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.practiceId, practiceId)));
    if (!job) return res.status(404).json({ message: "Job not found" });

    const comments = (job.commentsJson as any[]) || [];
    const newComment = {
      id: Date.now(),
      userId: req.user.id,
      userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      comment,
      createdAt: new Date(),
    };
    comments.push(newComment);

    await db.update(jobs).set({ commentsJson: comments }).where(eq(jobs.id, jobId));
    res.json({ message: "Comment added successfully", comments });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to add comment", error: error.message });
  }
});

// ===========================================================================
// 4. FEES, INVOICES & ESTIMATES (Capium Article 9000236009)
// ===========================================================================
router.get("/invoices", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select({
      id: feesInvoices.id,
      invoiceNumber: feesInvoices.invoiceNumber,
      date: feesInvoices.date,
      dueDate: feesInvoices.dueDate,
      netAmount: feesInvoices.netAmount,
      vatAmount: feesInvoices.vatAmount,
      totalAmount: feesInvoices.totalAmount,
      paidAmount: feesInvoices.paidAmount,
      dueAmount: feesInvoices.dueAmount,
      status: feesInvoices.status,
      paymentMethod: feesInvoices.paymentMethod,
      paymentDate: feesInvoices.paymentDate,
      reference: feesInvoices.reference,
      isRecurring: feesInvoices.isRecurring,
      lineItemsJson: feesInvoices.lineItemsJson,
      clientId: feesInvoices.clientId,
      clientName: clients.clientName,
    })
    .from(feesInvoices)
    .leftJoin(clients, eq(feesInvoices.clientId, clients.id))
    .where(eq(feesInvoices.practiceId, practiceId))
    .orderBy(desc(feesInvoices.date), desc(feesInvoices.id));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch invoices", error: error.message });
  }
});

router.post("/invoices", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { 
      clientId, date, dueDate, lineItems, reference, isRecurring, recurringInterval, status = "Draft" 
    } = req.body;

    if (!clientId) return res.status(400).json({ message: "Client is required" });

    // Calculate totals from line items or explicit netAmount/vatAmount
    let net = parseFloat(req.body.netAmount || "0");
    if (net <= 0 && lineItems && Array.isArray(lineItems)) {
      net = lineItems.reduce((acc: number, item: any) => {
        const itemVal = parseFloat(item.netAmount || item.amount || (parseFloat(item.rate || "0") * parseFloat(item.quantity || "1")) || "0");
        return acc + itemVal;
      }, 0);
    }
    let vat = req.body.vatAmount !== undefined ? parseFloat(req.body.vatAmount || "0") : (net * 0.20);
    const total = req.body.totalAmount ? parseFloat(req.body.totalAmount) : (net + vat);

    const allInvoices = await db.select({ id: feesInvoices.id }).from(feesInvoices).where(eq(feesInvoices.practiceId, practiceId));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(4, '0')}`;

    const [result] = await db.insert(feesInvoices).values({
      practiceId,
      clientId: parseInt(clientId),
      invoiceNumber,
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      netAmount: net.toFixed(2),
      vatAmount: vat.toFixed(2),
      totalAmount: total.toFixed(2),
      paidAmount: "0.00",
      dueAmount: total.toFixed(2),
      status: status || "Draft",
      reference: reference || undefined,
      lineItemsJson: lineItems || [],
      isRecurring: !!isRecurring,
      recurringInterval: recurringInterval || undefined,
    });

    res.json({ id: result.insertId, invoiceNumber, message: "Invoice created successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create invoice", error: error.message });
  }
});

// Record Payment on Invoice (Bank, Card, Cash, Cheque)
router.post("/invoices/:id/payment", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const invoiceId = parseInt(req.params.id);
    const { amount, paymentMethod, paymentDate, paymentNotes } = req.body;

    const [inv] = await db.select().from(feesInvoices).where(and(eq(feesInvoices.id, invoiceId), eq(feesInvoices.practiceId, practiceId)));
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    const payAmt = parseFloat(amount || "0");
    const currentPaid = parseFloat(inv.paidAmount as string || "0");
    const newPaid = currentPaid + payAmt;
    const totalAmt = parseFloat(inv.totalAmount as string || "0");
    const newDue = Math.max(0, totalAmt - newPaid);

    let newStatus = "Partial";
    if (newDue <= 0.01) newStatus = "Paid";

    await db.update(feesInvoices).set({
      paidAmount: newPaid.toFixed(2),
      dueAmount: newDue.toFixed(2),
      status: newStatus,
      paymentMethod: paymentMethod || "Bank Transfer",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentNotes: paymentNotes || undefined,
    }).where(eq(feesInvoices.id, invoiceId));

    res.json({ 
      message: `Payment of £${payAmt.toFixed(2)} recorded successfully. Invoice status: ${newStatus}`,
      paidAmount: newPaid.toFixed(2),
      dueAmount: newDue.toFixed(2),
      status: newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to record payment", error: error.message });
  }
});

// Send/Log Payment Reminder
router.post("/invoices/:id/reminder", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const invoiceId = parseInt(req.params.id);
    const { reminderType = "due_date" } = req.body;

    const [inv] = await db.select().from(feesInvoices).where(and(eq(feesInvoices.id, invoiceId), eq(feesInvoices.practiceId, practiceId)));
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    const reminders = (inv.remindersJson as any[]) || [];
    reminders.push({
      date: new Date(),
      type: reminderType,
      sentBy: req.user.email,
    });

    await db.update(feesInvoices).set({ remindersJson: reminders }).where(eq(feesInvoices.id, invoiceId));
    res.json({ message: "Payment reminder logged and dispatched to client" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to log reminder", error: error.message });
  }
});

// Estimates (Quotations) CRUD
router.get("/estimates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select({
      id: timeFeesEstimates.id,
      estimateNumber: timeFeesEstimates.estimateNumber,
      reference: timeFeesEstimates.reference,
      poNumber: timeFeesEstimates.poNumber,
      estimateDate: timeFeesEstimates.estimateDate,
      expiryDate: timeFeesEstimates.expiryDate,
      netAmount: timeFeesEstimates.netAmount,
      vatAmount: timeFeesEstimates.vatAmount,
      totalAmount: timeFeesEstimates.totalAmount,
      status: timeFeesEstimates.status,
      lineItemsJson: timeFeesEstimates.lineItemsJson,
      clientId: timeFeesEstimates.clientId,
      clientName: clients.clientName,
      convertedInvoiceId: timeFeesEstimates.convertedInvoiceId,
    })
    .from(timeFeesEstimates)
    .leftJoin(clients, eq(timeFeesEstimates.clientId, clients.id))
    .where(eq(timeFeesEstimates.practiceId, practiceId))
    .orderBy(desc(timeFeesEstimates.estimateDate));

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch estimates", error: error.message });
  }
});

router.post("/estimates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, reference, poNumber, estimateDate, expiryDate, lineItems, notes } = req.body;

    if (!clientId) return res.status(400).json({ message: "Client is required" });

    let net = 0;
    if (lineItems && Array.isArray(lineItems)) {
      net = lineItems.reduce((acc: number, item: any) => acc + (parseFloat(item.rate || "0") * parseFloat(item.quantity || "1")), 0);
    }

    const vat = net * 0.20;
    const total = net + vat;

    const allEstimates = await db.select({ id: timeFeesEstimates.id }).from(timeFeesEstimates).where(eq(timeFeesEstimates.practiceId, practiceId));
    const estimateNumber = `EST-${new Date().getFullYear()}-${String(allEstimates.length + 1).padStart(4, '0')}`;

    const [result] = await db.insert(timeFeesEstimates).values({
      practiceId,
      clientId: parseInt(clientId),
      estimateNumber,
      reference: reference || undefined,
      poNumber: poNumber || undefined,
      estimateDate: estimateDate ? new Date(estimateDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      netAmount: net.toFixed(2),
      vatAmount: vat.toFixed(2),
      totalAmount: total.toFixed(2),
      status: "Sent",
      lineItemsJson: lineItems || [],
      notes: notes || undefined,
    });

    res.json({ id: result.insertId, estimateNumber, message: "Estimate created successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create estimate", error: error.message });
  }
});

// Convert Estimate to Invoice (1-Click conversion per Capium standard)
router.post("/estimates/:id/convert", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const estimateId = parseInt(req.params.id);

    const [est] = await db.select().from(timeFeesEstimates).where(and(eq(timeFeesEstimates.id, estimateId), eq(timeFeesEstimates.practiceId, practiceId)));
    if (!est) return res.status(404).json({ message: "Estimate not found" });

    const allInvoices = await db.select({ id: feesInvoices.id }).from(feesInvoices).where(eq(feesInvoices.practiceId, practiceId));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(allInvoices.length + 1).padStart(4, '0')}`;

    const [invResult] = await db.insert(feesInvoices).values({
      practiceId,
      clientId: est.clientId,
      invoiceNumber,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      netAmount: est.netAmount,
      vatAmount: est.vatAmount,
      totalAmount: est.totalAmount,
      paidAmount: "0.00",
      dueAmount: est.totalAmount,
      status: "Draft",
      reference: `Converted from ${est.estimateNumber}`,
      lineItemsJson: est.lineItemsJson,
    });

    await db.update(timeFeesEstimates).set({
      status: "Converted",
      convertedInvoiceId: invResult.insertId,
    }).where(eq(timeFeesEstimates.id, estimateId));

    res.json({ 
      message: `Estimate ${est.estimateNumber} successfully converted to Invoice ${invoiceNumber}!`,
      invoiceId: invResult.insertId,
      invoiceNumber,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to convert estimate", error: error.message });
  }
});

// ===========================================================================
// 5. EXPENSES (Capium Article 9000235913)
// ===========================================================================
router.get("/expenses", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select({
      id: expenses.id,
      expenseDate: expenses.expenseDate,
      category: expenses.category,
      amount: expenses.amount,
      billable: expenses.billable,
      status: expenses.status,
      receiptPath: expenses.receiptPath,
      notes: expenses.notes,
      isReimbursed: expenses.isReimbursed,
      jobId: expenses.jobId,
      jobName: jobs.jobName,
      clientId: expenses.clientId,
      clientName: clients.clientName,
      userId: expenses.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(expenses)
    .leftJoin(jobs, eq(expenses.jobId, jobs.id))
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .leftJoin(users, eq(expenses.userId, users.id))
    .where(eq(expenses.practiceId, practiceId))
    .orderBy(desc(expenses.expenseDate));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
});

router.post("/expenses", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const { clientId, jobId, expenseDate, category, amount, billable, notes } = req.body;

    if (!amount) return res.status(400).json({ message: "Amount is required" });

    const [result] = await db.insert(expenses).values({
      practiceId,
      userId,
      clientId: clientId ? parseInt(clientId) : null,
      jobId: jobId ? parseInt(jobId) : null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      category: category || "Travel",
      amount: parseFloat(amount).toFixed(2),
      billable: billable !== undefined ? !!billable : true,
      status: "Unsubmitted",
      notes: notes || undefined,
      isReimbursed: false,
    });

    res.json({ id: result.insertId, message: "Expense recorded successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to record expense", error: error.message });
  }
});

router.post("/expenses/submit-pfa", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids } = req.body;
    for (const id of ids) {
      await db.update(expenses).set({ status: "PFA" }).where(and(eq(expenses.id, id), eq(expenses.practiceId, practiceId)));
    }
    res.json({ message: `${ids.length} expense(s) submitted for approval` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to submit expenses", error: error.message });
  }
});

router.post("/expenses/approve", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids } = req.body;
    for (const id of ids) {
      await db.update(expenses).set({ 
        status: "Approved", 
        approvedBy: req.user.id, 
        approvedAt: new Date() 
      }).where(and(eq(expenses.id, id), eq(expenses.practiceId, practiceId)));
    }
    res.json({ message: `${ids.length} expense(s) approved` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to approve expenses", error: error.message });
  }
});

// ===========================================================================
// 6. REPORTS & PROFITABILITY (Capium Article 9000235911)
// ===========================================================================
router.get("/reports/profitability", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));
    const allTimesheets = await db.select().from(timesheets).where(eq(timesheets.practiceId, practiceId));
    const allInvoices = await db.select().from(feesInvoices).where(eq(feesInvoices.practiceId, practiceId));

    const report = practiceClients.map(c => {
      const cTimesheets = allTimesheets.filter(t => t.clientId === c.id);
      const cInvoices = allInvoices.filter(i => i.clientId === c.id);

      const totalHours = cTimesheets.reduce((acc, t) => acc + parseFloat(t.hours as string || "0"), 0);
      const billableHours = cTimesheets.filter(t => t.billable).reduce((acc, t) => acc + parseFloat(t.hours as string || "0"), 0);
      const billableRevenue = cTimesheets.filter(t => t.billable).reduce((acc, t) => acc + (parseFloat(t.hours as string || "0") * parseFloat(t.ratePerHour as string || "85")), 0);
      const staffCost = cTimesheets.reduce((acc, t) => acc + (parseFloat(t.hours as string || "0") * parseFloat(t.costRate as string || "40")), 0);
      const actualInvoiced = cInvoices.reduce((acc, i) => acc + parseFloat(i.totalAmount as string || "0"), 0);
      const netProfit = billableRevenue - staffCost;
      const margin = billableRevenue > 0 ? ((netProfit / billableRevenue) * 100).toFixed(1) : "0.0";

      return {
        clientId: c.id,
        clientName: c.clientName,
        totalHours: parseFloat(totalHours.toFixed(2)),
        billableHours: parseFloat(billableHours.toFixed(2)),
        billableRevenue: parseFloat(billableRevenue.toFixed(2)),
        staffCost: parseFloat(staffCost.toFixed(2)),
        actualInvoiced: parseFloat(actualInvoiced.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        margin,
      };
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate profitability report", error: error.message });
  }
});

// WIP Ledger (Unbilled Work In Progress)
router.get("/reports/wip", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const unbilledTimesheets = await db.select({
      id: timesheets.id,
      date: timesheets.date,
      hours: timesheets.hours,
      ratePerHour: timesheets.ratePerHour,
      taskName: timesheets.taskName,
      description: timesheets.description,
      clientId: timesheets.clientId,
      clientName: clients.clientName,
      userName: users.firstName,
    })
    .from(timesheets)
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .leftJoin(users, eq(timesheets.userId, users.id))
    .where(
      and(
        eq(timesheets.practiceId, practiceId),
        eq(timesheets.billable, true),
        inArray(timesheets.status, ["Approved", "Submitted", "Unsubmitted", "PFA"])
      )
    )
    .orderBy(desc(timesheets.date));

    const totalWipHours = unbilledTimesheets.reduce((acc, t) => acc + parseFloat(t.hours as string || "0"), 0);
    const totalWipValue = unbilledTimesheets.reduce((acc, t) => acc + (parseFloat(t.hours as string || "0") * parseFloat(t.ratePerHour as string || "85")), 0);

    res.json({
      totalWipHours: parseFloat(totalWipHours.toFixed(2)),
      totalWipValue: parseFloat(totalWipValue.toFixed(2)),
      entries: unbilledTimesheets,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate WIP ledger", error: error.message });
  }
});

// ===========================================================================
// 7. SETTINGS & PREFERENCES (Capium Article 9000235943)
// ===========================================================================
router.get("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const [settings] = await db.select().from(timeFeesSettings).where(eq(timeFeesSettings.practiceId, practiceId));
    const [practice] = await db.select().from(practices).where(eq(practices.id, practiceId));

    res.json({
      practice: practice || null,
      settings: settings || {
        startWeekOn: "Monday",
        defaultCapacityHours: "37.50",
        defaultHourlyRate: "75.00",
        mileageRate: "0.45",
        minChargeableTime: 15,
        timesheetDueDay: "Friday",
        timeFormat: "decimal",
        timeMode: "duration",
        invoicePrefix: "INV-",
        estimatePrefix: "EST-",
        defaultVatRate: "20.00",
        defaultPaymentTermsDays: 30,
        autoGenerateInvoices: false,
        paymentMethod: "BACS",
        bankDetails: "",
        invoiceFooter: "Payment terms: 30 days net. Thank you for your business.",
        estimateFooter: "This estimate is valid for 30 days from date of issue.",
        activitiesJson: null,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settings", error: error.message });
  }
});

router.post("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const data = req.body;

    const payload = {
      startWeekOn: data.startWeekOn || "Monday",
      defaultCapacityHours: data.defaultCapacityHours?.toString() || "37.50",
      defaultHourlyRate: data.defaultHourlyRate?.toString() || "75.00",
      mileageRate: data.mileageRate?.toString() || "0.45",
      minChargeableTime: Number(data.minChargeableTime) || 15,
      timesheetDueDay: data.timesheetDueDay || "Friday",
      timeFormat: data.timeFormat || "decimal",
      timeMode: data.timeMode || "duration",
      invoicePrefix: data.invoicePrefix || "INV-",
      estimatePrefix: data.estimatePrefix || "EST-",
      defaultVatRate: data.defaultVatRate?.toString() || "20.00",
      defaultPaymentTermsDays: Number(data.defaultPaymentTermsDays) || 30,
      autoGenerateInvoices: Boolean(data.autoGenerateInvoices),
      paymentMethod: data.paymentMethod || "BACS",
      bankDetails: data.bankDetails || "",
      invoiceFooter: data.invoiceFooter || "",
      estimateFooter: data.estimateFooter || "",
      activitiesJson: data.activitiesJson ? (typeof data.activitiesJson === "string" ? JSON.parse(data.activitiesJson) : data.activitiesJson) : null,
      updatedAt: new Date()
    };

    const [existing] = await db.select().from(timeFeesSettings).where(eq(timeFeesSettings.practiceId, practiceId));
    if (existing) {
      await db.update(timeFeesSettings).set(payload).where(eq(timeFeesSettings.practiceId, practiceId));
      res.json({ message: "Time & Fees settings updated successfully" });
    } else {
      await db.insert(timeFeesSettings).values({ ...payload, practiceId });
      res.json({ message: "Time & Fees settings saved successfully" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save settings", error: error.message });
  }
});

export default router;
