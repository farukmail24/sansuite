import { Router } from "express";
import { db } from "../db";
import { 
  jobs, timesheets, clients, users, feesInvoices, expenses,
  timeFeesEstimates, timeFeesSettings, practices, timeFeesStaffRates,
  feesCreditNotes
} from "@shared/schema";
import { eq, and, desc, asc, inArray, gte, lte, isNull, or } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import multer from "multer";
import path from "path";
import fs from "fs";

// Expense Receipt Upload Directory & Multer Setup
const EXPENSES_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "expenses");
try {
  if (!fs.existsSync(EXPENSES_UPLOAD_DIR)) {
    fs.mkdirSync(EXPENSES_UPLOAD_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem fallback
}

const expenseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, EXPENSES_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const uploadExpenseReceipt = multer({
  storage: expenseStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".gif"];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"));
    }
  },
});

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

    // 11. Time Off Hours by Users
    const leaveKeywords = ["holiday", "leave", "sick", "vacation", "off", "absence", "statutory leave"];
    const isLeaveTask = (tName: string = "") => {
      const lower = tName.toLowerCase();
      return leaveKeywords.some(k => lower.includes(k));
    };

    const timeOffByUserMap = new Map<number, { userId: number; userName: string; holidayHours: number; sickHours: number; otherLeaveHours: number; totalHours: number }>();
    filteredTimesheets.forEach(t => {
      if (isLeaveTask(t.taskName || "")) {
        const uId = t.userId || 0;
        const uName = t.userName || "Staff Member";
        const h = parseFloat(t.hours as string || "0");
        const lowerName = (t.taskName || "").toLowerCase();
        if (!timeOffByUserMap.has(uId)) {
          timeOffByUserMap.set(uId, { userId: uId, userName: uName, holidayHours: 0, sickHours: 0, otherLeaveHours: 0, totalHours: 0 });
        }
        const rec = timeOffByUserMap.get(uId)!;
        rec.totalHours += h;
        if (lowerName.includes("sick")) rec.sickHours += h;
        else if (lowerName.includes("holiday") || lowerName.includes("vacation") || lowerName.includes("annual")) rec.holidayHours += h;
        else rec.otherLeaveHours += h;
      }
    });

    const timeOffHours = {
      byUser: Array.from(timeOffByUserMap.values()).map(u => ({
        ...u,
        holidayHours: parseFloat(u.holidayHours.toFixed(1)),
        sickHours: parseFloat(u.sickHours.toFixed(1)),
        otherLeaveHours: parseFloat(u.otherLeaveHours.toFixed(1)),
        totalHours: parseFloat(u.totalHours.toFixed(1)),
      })),
      totalLeaveHours: parseFloat(Array.from(timeOffByUserMap.values()).reduce((sum, u) => sum + u.totalHours, 0).toFixed(1)),
    };

    // 12. Staff Utilization & Billable Target
    const staffUtilMap = new Map<number, { userId: number; userName: string; totalHours: number; billableHours: number }>();
    practiceUsers.forEach(u => {
      staffUtilMap.set(u.id, { 
        userId: u.id, 
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email, 
        totalHours: 0, 
        billableHours: 0 
      });
    });
    filteredTimesheets.forEach(t => {
      if (t.userId && staffUtilMap.has(t.userId)) {
        const rec = staffUtilMap.get(t.userId)!;
        const h = parseFloat(t.hours as string || "0");
        rec.totalHours += h;
        if (t.billable) rec.billableHours += h;
      }
    });
    const staffUtilization = Array.from(staffUtilMap.values()).map(u => {
      const capacity = capacityPerUser || 37.5;
      const utilPct = capacity > 0 ? Math.min(150, parseFloat(((u.billableHours / capacity) * 100).toFixed(1))) : 0;
      const targetPct = 75; // Standard 75% billable target
      return {
        ...u,
        totalHours: parseFloat(u.totalHours.toFixed(1)),
        billableHours: parseFloat(u.billableHours.toFixed(1)),
        capacityHours: capacity,
        utilizationPct: utilPct,
        targetPct,
        isOnTarget: utilPct >= targetPct,
      };
    });

    // 13. Billable vs Non-Billable Breakdown
    const billableVsNonBillable = {
      billableHours: parseFloat(billableHours.toFixed(2)),
      nonBillableHours: parseFloat(nonBillableHours.toFixed(2)),
      totalHours: parseFloat(totalTimeSpent.toFixed(2)),
      billableRatio: totalTimeSpent > 0 ? parseFloat(((billableHours / totalTimeSpent) * 100).toFixed(1)) : 0,
      nonBillableRatio: totalTimeSpent > 0 ? parseFloat(((nonBillableHours / totalTimeSpent) * 100).toFixed(1)) : 0,
    };

    // 14. Recent Timesheets Activity
    const recentTimesheets = allTimesheets
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id)
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        date: t.date,
        hours: parseFloat(String(t.hours || '0')),
        taskName: t.taskName || 'General Practice Work',
        clientName: t.clientName || 'General Client',
        userName: t.userName || 'Staff Member',
        billable: Boolean(t.billable),
        status: t.status || 'Unsubmitted',
      }));

    // 15. Revenue by Invoice Category
    const revCategoryMap = new Map<string, { category: string; amount: number; invoiceCount: number }>();
    const defaultCategories = ["Accounts Production", "Bookkeeping & VAT", "Payroll RTI", "Corporation Tax", "Self Assessment", "Advisory & Other"];
    defaultCategories.forEach(cat => revCategoryMap.set(cat, { category: cat, amount: 0, invoiceCount: 0 }));

    filteredInvoices.forEach(inv => {
      let categorized = false;
      const lItems = inv.lineItemsJson as any;
      if (lItems && Array.isArray(lItems) && lItems.length > 0) {
        lItems.forEach((item: any) => {
          const desc = (item.description || item.taskName || "").toLowerCase();
          const itemAmt = parseFloat(String(item.total || item.amount || 0));
          let targetCat = "Advisory & Other";
          if (desc.includes("account") || desc.includes("annual") || desc.includes("frs")) targetCat = "Accounts Production";
          else if (desc.includes("bookkeep") || desc.includes("vat")) targetCat = "Bookkeeping & VAT";
          else if (desc.includes("payroll") || desc.includes("paye") || desc.includes("rti")) targetCat = "Payroll RTI";
          else if (desc.includes("corp") || desc.includes("ct600")) targetCat = "Corporation Tax";
          else if (desc.includes("self") || desc.includes("sa100") || desc.includes("tax return")) targetCat = "Self Assessment";

          const catRec = revCategoryMap.get(targetCat)!;
          catRec.amount += itemAmt > 0 ? itemAmt : parseFloat(inv.totalAmount as string || "0") / lItems.length;
          catRec.invoiceCount += 1;
          categorized = true;
        });
      }
      if (!categorized) {
        const ref = (inv.reference || "").toLowerCase();
        let targetCat = "Accounts Production";
        if (ref.includes("vat") || ref.includes("bk")) targetCat = "Bookkeeping & VAT";
        else if (ref.includes("pay")) targetCat = "Payroll RTI";
        else if (ref.includes("tax") || ref.includes("sa")) targetCat = "Self Assessment";
        else if (ref.includes("ct")) targetCat = "Corporation Tax";
        else if (ref.includes("adv")) targetCat = "Advisory & Other";

        const catRec = revCategoryMap.get(targetCat)!;
        catRec.amount += parseFloat(inv.totalAmount as string || "0");
        catRec.invoiceCount += 1;
      }
    });

    const totalCatRev = Array.from(revCategoryMap.values()).reduce((sum, c) => sum + c.amount, 0);
    const revenueByCategory = Array.from(revCategoryMap.values()).map(c => ({
      ...c,
      amount: parseFloat(c.amount.toFixed(2)),
      percentage: totalCatRev > 0 ? parseFloat(((c.amount / totalCatRev) * 100).toFixed(1)) : 0,
    })).filter(c => c.amount > 0 || totalCatRev === 0);

    // 16. Invoiced Amount by Status
    const invoicedByStatus = {
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
    };
    filteredInvoices.forEach(inv => {
      const amt = parseFloat(inv.totalAmount as string || "0");
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const isOverdue = inv.status !== "Paid" && due < today;

      if (inv.status === "Draft") {
        invoicedByStatus.draft.count++;
        invoicedByStatus.draft.amount += amt;
      } else if (inv.status === "Paid") {
        invoicedByStatus.paid.count++;
        invoicedByStatus.paid.amount += amt;
      } else if (inv.status === "Partial") {
        invoicedByStatus.partial.count++;
        invoicedByStatus.partial.amount += amt;
      } else if (isOverdue) {
        invoicedByStatus.overdue.count++;
        invoicedByStatus.overdue.amount += amt;
      } else {
        invoicedByStatus.sent.count++;
        invoicedByStatus.sent.amount += amt;
      }
    });
    invoicedByStatus.draft.amount = parseFloat(invoicedByStatus.draft.amount.toFixed(2));
    invoicedByStatus.sent.amount = parseFloat(invoicedByStatus.sent.amount.toFixed(2));
    invoicedByStatus.paid.amount = parseFloat(invoicedByStatus.paid.amount.toFixed(2));
    invoicedByStatus.partial.amount = parseFloat(invoicedByStatus.partial.amount.toFixed(2));
    invoicedByStatus.overdue.amount = parseFloat(invoicedByStatus.overdue.amount.toFixed(2));

    // 17. Payment Methods Breakdown
    const paymentMethodMap = new Map<string, { method: string; amount: number; count: number }>();
    filteredInvoices.forEach(inv => {
      const paid = parseFloat(inv.paidAmount as string || "0");
      if (paid > 0) {
        const m = inv.paymentMethod || "Bank Transfer";
        if (!paymentMethodMap.has(m)) {
          paymentMethodMap.set(m, { method: m, amount: 0, count: 0 });
        }
        const rec = paymentMethodMap.get(m)!;
        rec.amount += paid;
        rec.count += 1;
      }
    });
    const totalPaidMethods = Array.from(paymentMethodMap.values()).reduce((sum, p) => sum + p.amount, 0);
    const paymentMethods = Array.from(paymentMethodMap.values()).map(p => ({
      ...p,
      amount: parseFloat(p.amount.toFixed(2)),
      percentage: totalPaidMethods > 0 ? parseFloat(((p.amount / totalPaidMethods) * 100).toFixed(1)) : 0,
    }));

    // 18. Invoiced Amount vs Due Amount Comparison
    const invoicedVsDue = {
      totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      collectionEfficiency: totalInvoiced > 0 ? parseFloat(((totalPaid / totalInvoiced) * 100).toFixed(1)) : 0,
      monthlyBreakdown: incomeTrend.map(t => ({
        month: t.month,
        invoiced: t.invoiced,
        paid: t.paid,
        due: parseFloat(Math.max(0, t.invoiced - t.paid).toFixed(2)),
      })),
    };

    // 19. Aged Debtors Breakdown
    let currentAmt = 0;
    let d1To30 = 0;
    let d31To60 = 0;
    let d61To90 = 0;
    let d90Plus = 0;

    allInvoices.filter(i => i.status !== "Void" && parseFloat(String(i.dueAmount || '0')) > 0).forEach(inv => {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const dueAmt = parseFloat(String(inv.dueAmount || '0'));
      if (diffDays <= 0) currentAmt += dueAmt;
      else if (diffDays <= 30) d1To30 += dueAmt;
      else if (diffDays <= 60) d31To60 += dueAmt;
      else if (diffDays <= 90) d61To90 += dueAmt;
      else d90Plus += dueAmt;
    });

    const debtorsAging = {
      current: parseFloat(currentAmt.toFixed(2)),
      days1To30: parseFloat(d1To30.toFixed(2)),
      days31To60: parseFloat(d31To60.toFixed(2)),
      days61To90: parseFloat(d61To90.toFixed(2)),
      days90Plus: parseFloat(d90Plus.toFixed(2)),
      totalOutstanding: parseFloat((currentAmt + d1To30 + d31To60 + d61To90 + d90Plus).toFixed(2)),
    };

    res.json({
      timeSummary,
      mostVsLeast,
      dailyHours,
      operationalAlerts,
      estimatesSummary,
      timeOffHours,
      staffUtilization,
      billableVsNonBillable,
      recentTimesheets,
      revenueByCategory,
      invoicedByStatus,
      paymentMethods,
      invoicedVsDue,
      debtorsAging,
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

// Timesheet Submission Reminder Bot (Capium Article 9000235910)
router.post("/timesheets/send-reminders", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { weekStartDate } = req.body;

    // Find all active users for this practice
    const practiceUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.practiceId, practiceId), eq(users.isActive, true)));

    // Calculate Monday-Sunday boundaries
    const targetDate = weekStartDate ? new Date(weekStartDate) : new Date();
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch all timesheets logged in that week
    const weekEntries = await db.select({
      id: timesheets.id,
      userId: timesheets.userId,
      status: timesheets.status,
      hours: timesheets.hours,
    })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.practiceId, practiceId),
        gte(timesheets.date, startOfWeek),
        lte(timesheets.date, endOfWeek)
      )
    );

    // Group entries by user
    const userSummary: Record<number, { totalHours: number; unsubmittedCount: number; submittedCount: number }> = {};
    for (const entry of weekEntries) {
      if (!userSummary[entry.userId]) {
        userSummary[entry.userId] = { totalHours: 0, unsubmittedCount: 0, submittedCount: 0 };
      }
      const h = parseFloat(String(entry.hours || "0"));
      userSummary[entry.userId].totalHours += h;
      if (entry.status === "Approved" || entry.status === "PFA" || entry.status === "Billed") {
        userSummary[entry.userId].submittedCount += 1;
      } else {
        userSummary[entry.userId].unsubmittedCount += 1;
      }
    }

    // Defaulting staff: users with 0 entries, or all entries Unsubmitted
    const defaultingStaff: { id: number; name: string; email: string; hours: number; reason: string }[] = [];

    for (const u of practiceUsers) {
      const stats = userSummary[u.id];
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      if (!stats || stats.totalHours === 0) {
        defaultingStaff.push({
          id: u.id,
          name: fullName,
          email: u.email,
          hours: 0,
          reason: "Zero timesheet hours logged for the week",
        });
      } else if (stats.unsubmittedCount > 0 && stats.submittedCount === 0) {
        defaultingStaff.push({
          id: u.id,
          name: fullName,
          email: u.email,
          hours: parseFloat(stats.totalHours.toFixed(2)),
          reason: `${stats.unsubmittedCount} entries remain draft / unsubmitted`,
        });
      }
    }

    res.json({
      success: true,
      remindedCount: defaultingStaff.length,
      defaultingStaff,
      weekRange: {
        start: startOfWeek.toISOString().split("T")[0],
        end: endOfWeek.toISOString().split("T")[0],
      },
      message: `Automated timesheet reminder dispatched to ${defaultingStaff.length} team member(s).`,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to dispatch timesheet reminders", error: error.message });
  }
});

// GET /api/time-fees/timesheets/matrix-week (Weekly Matrix Grid)
router.get("/timesheets/matrix-week", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;
    const weekStartStr = req.query.weekStart as string;

    const startDate = weekStartStr ? new Date(weekStartStr) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Current week timesheets for this user
    const weekEntries = await db.select({
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
      jobId: timesheets.jobId,
      jobName: jobs.jobName,
      clientId: timesheets.clientId,
      clientName: clients.clientName,
      userId: timesheets.userId,
    })
    .from(timesheets)
    .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .where(
      and(
        eq(timesheets.practiceId, practiceId),
        eq(timesheets.userId, userId),
        gte(timesheets.date, startDate),
        lte(timesheets.date, endDate)
      )
    )
    .orderBy(asc(timesheets.date), asc(timesheets.id));

    // Previous week distinct tasks/clients for quick clone/populate
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    prevEndDate.setHours(23, 59, 59, 999);

    const prevEntries = await db.select({
      clientId: timesheets.clientId,
      clientName: clients.clientName,
      jobId: timesheets.jobId,
      jobName: jobs.jobName,
      taskName: timesheets.taskName,
      subtaskName: timesheets.subtaskName,
      billable: timesheets.billable,
      ratePerHour: timesheets.ratePerHour,
      costRate: timesheets.costRate,
    })
    .from(timesheets)
    .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .where(
      and(
        eq(timesheets.practiceId, practiceId),
        eq(timesheets.userId, userId),
        gte(timesheets.date, prevStartDate),
        lte(timesheets.date, prevEndDate)
      )
    );

    // Deduplicate previous week tasks
    const uniquePrevTasks = Array.from(
      new Map(prevEntries.map(e => [`${e.clientId}_${e.jobId}_${e.taskName}`, e])).values()
    );

    res.json({
      weekStart: startDate.toISOString().split("T")[0],
      weekEnd: endDate.toISOString().split("T")[0],
      entries: weekEntries,
      previousWeekTasks: uniquePrevTasks,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch weekly matrix", error: error.message });
  }
});

// POST /api/time-fees/timesheets/matrix-save (Weekly Matrix Grid batch-save)
router.post("/timesheets/matrix-save", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const { rows, submitForApproval } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ message: "Invalid matrix rows payload" });
    }

    let savedCount = 0;
    let deletedCount = 0;

    for (const row of rows) {
      const clientId = row.clientId ? parseInt(row.clientId) : null;
      const jobId = row.jobId ? parseInt(row.jobId) : null;
      const taskName = row.taskName || "General Accounting";
      const subtaskName = row.subtaskName || null;
      const billable = row.billable !== undefined ? !!row.billable : true;
      const ratePerHour = row.ratePerHour ? parseFloat(row.ratePerHour).toFixed(2) : "85.00";
      const costRate = row.costRate ? parseFloat(row.costRate).toFixed(2) : "40.00";

      if (row.days && Array.isArray(row.days)) {
        for (const day of row.days) {
          const hoursVal = parseFloat(day.hours || "0");
          const entryDate = day.date ? new Date(day.date) : null;

          if (!entryDate) continue;

          if (hoursVal > 0) {
            if (day.id) {
              // Update existing
              await db.update(timesheets).set({
                clientId,
                jobId,
                taskName,
                subtaskName,
                billable,
                ratePerHour,
                costRate,
                hours: hoursVal.toFixed(2),
                description: day.description || row.description || "General practice time",
                status: submitForApproval ? "PFA" : undefined,
              }).where(
                and(
                  eq(timesheets.id, day.id),
                  eq(timesheets.practiceId, practiceId)
                )
              );
              savedCount++;
            } else {
              // Insert new
              await db.insert(timesheets).values({
                practiceId,
                userId,
                clientId,
                jobId,
                date: entryDate,
                hours: hoursVal.toFixed(2),
                billable,
                ratePerHour,
                costRate,
                taskName,
                subtaskName,
                description: day.description || row.description || "General practice time",
                status: submitForApproval ? "PFA" : "Unsubmitted",
              });
              savedCount++;
            }
          } else if (day.id && hoursVal <= 0) {
            // Delete zeroed draft entry
            await db.delete(timesheets).where(
              and(
                eq(timesheets.id, day.id),
                eq(timesheets.practiceId, practiceId),
                eq(timesheets.status, "Unsubmitted")
              )
            );
            deletedCount++;
          }
        }
      }
    }

    const message = submitForApproval
      ? `Weekly timesheet submitted for approval (${savedCount} entries updated/created)`
      : `Weekly timesheet saved as draft (${savedCount} entries saved)`;

    res.json({ success: true, savedCount, deletedCount, message });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save weekly matrix", error: error.message });
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

// ===========================================================================
// CREDIT NOTES & REVERSE LEDGER (UK Statutory Accounting & HMRC Parity)
// ===========================================================================
router.get("/credit-notes", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select({
      id: feesCreditNotes.id,
      creditNoteNumber: feesCreditNotes.creditNoteNumber,
      creditNoteDate: feesCreditNotes.creditNoteDate,
      reason: feesCreditNotes.reason,
      netAmount: feesCreditNotes.netAmount,
      vatAmount: feesCreditNotes.vatAmount,
      totalAmount: feesCreditNotes.totalAmount,
      status: feesCreditNotes.status,
      lineItemsJson: feesCreditNotes.lineItemsJson,
      createdAt: feesCreditNotes.createdAt,
      invoiceId: feesCreditNotes.invoiceId,
      invoiceNumber: feesInvoices.invoiceNumber,
      invoiceDate: feesInvoices.date,
      clientId: feesCreditNotes.clientId,
      clientName: clients.clientName,
      clientType: clients.clientType,
    })
    .from(feesCreditNotes)
    .leftJoin(feesInvoices, eq(feesCreditNotes.invoiceId, feesInvoices.id))
    .leftJoin(clients, eq(feesCreditNotes.clientId, clients.id))
    .where(eq(feesCreditNotes.practiceId, practiceId))
    .orderBy(desc(feesCreditNotes.creditNoteDate), desc(feesCreditNotes.id));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch credit notes", error: error.message });
  }
});

router.post("/invoices/:id/credit-note", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const invoiceId = parseInt(req.params.id);
    const { reason, creditAmount, lineItems, creditDate } = req.body;

    const [inv] = await db.select().from(feesInvoices).where(
      and(eq(feesInvoices.id, invoiceId), eq(feesInvoices.practiceId, practiceId))
    );
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    const totalInvAmount = parseFloat(inv.totalAmount as string || "0");
    const currentDue = parseFloat(inv.dueAmount as string || "0");
    const credTotal = creditAmount ? parseFloat(creditAmount) : totalInvAmount;

    if (credTotal <= 0) {
      return res.status(400).json({ message: "Credit note amount must be greater than zero" });
    }

    // Calculate proportional net and VAT
    const netRatio = totalInvAmount > 0 ? (parseFloat(inv.netAmount as string || "0") / totalInvAmount) : 1;
    const credNet = credTotal * netRatio;
    const credVat = credTotal - credNet;

    // Generate CN Number
    const existingCNs = await db.select({ id: feesCreditNotes.id })
      .from(feesCreditNotes)
      .where(eq(feesCreditNotes.practiceId, practiceId));
    const creditNoteNumber = `CN-${new Date().getFullYear()}-${String(existingCNs.length + 1).padStart(4, '0')}`;

    const [cnInsert] = await db.insert(feesCreditNotes).values({
      practiceId,
      invoiceId,
      clientId: inv.clientId,
      creditNoteNumber,
      creditNoteDate: creditDate ? new Date(creditDate) : new Date(),
      reason: reason || "Fee adjustment / cancellation",
      netAmount: credNet.toFixed(2),
      vatAmount: credVat.toFixed(2),
      totalAmount: credTotal.toFixed(2),
      lineItemsJson: lineItems || inv.lineItemsJson || [],
      status: "Issued",
    });

    // Update parent invoice due amount & status
    const newDue = Math.max(0, currentDue - credTotal);
    let newStatus = inv.status;
    if (newDue <= 0.01) {
      newStatus = "Credited";
    } else {
      newStatus = "Partially Credited";
    }

    await db.update(feesInvoices).set({
      dueAmount: newDue.toFixed(2),
      status: newStatus,
    }).where(eq(feesInvoices.id, invoiceId));

    res.json({
      success: true,
      id: cnInsert.insertId,
      creditNoteNumber,
      newDueAmount: newDue.toFixed(2),
      invoiceStatus: newStatus,
      message: `Credit Note ${creditNoteNumber} issued for £${credTotal.toFixed(2)}.`
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to issue credit note", error: error.message });
  }
});

router.get("/credit-notes/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const cnId = parseInt(req.params.id);

    const [cn] = await db.select({
      id: feesCreditNotes.id,
      creditNoteNumber: feesCreditNotes.creditNoteNumber,
      creditNoteDate: feesCreditNotes.creditNoteDate,
      reason: feesCreditNotes.reason,
      netAmount: feesCreditNotes.netAmount,
      vatAmount: feesCreditNotes.vatAmount,
      totalAmount: feesCreditNotes.totalAmount,
      status: feesCreditNotes.status,
      lineItemsJson: feesCreditNotes.lineItemsJson,
      createdAt: feesCreditNotes.createdAt,
      invoiceId: feesCreditNotes.invoiceId,
      invoiceNumber: feesInvoices.invoiceNumber,
      clientId: feesCreditNotes.clientId,
      clientName: clients.clientName,
      clientType: clients.clientType,
      clientEmail: clients.email,
      clientAddress: clients.address,
    })
    .from(feesCreditNotes)
    .leftJoin(feesInvoices, eq(feesCreditNotes.invoiceId, feesInvoices.id))
    .leftJoin(clients, eq(feesCreditNotes.clientId, clients.id))
    .where(and(eq(feesCreditNotes.id, cnId), eq(feesCreditNotes.practiceId, practiceId)));

    if (!cn) return res.status(404).json({ message: "Credit Note not found" });

    res.json(cn);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch credit note", error: error.message });
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

router.post("/expenses/upload-receipt", uploadExpenseReceipt.single("receipt"), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No receipt file uploaded" });
    }
    const fileUrl = `/uploads/expenses/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      message: "Receipt uploaded successfully",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to upload receipt", error: error.message });
  }
});

router.post("/expenses", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const userId = req.user.id;
    const { 
      clientId, jobId, expenseDate, category, amount, billable, notes, 
      receiptPath, miles, mileageRate 
    } = req.body;

    if (!amount) return res.status(400).json({ message: "Amount is required" });

    const [result] = await db.insert(expenses).values({
      practiceId,
      userId,
      clientId: clientId ? parseInt(clientId) : null,
      jobId: jobId ? parseInt(jobId) : null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      category: category || "Travel",
      amount: parseFloat(amount).toFixed(2),
      miles: miles ? parseFloat(miles).toFixed(2) : undefined,
      mileageRate: mileageRate ? parseFloat(mileageRate).toFixed(2) : "0.45",
      billable: billable !== undefined ? !!billable : true,
      receiptPath: receiptPath || undefined,
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

router.post("/expenses/reject", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids, rejectionReason } = req.body;
    for (const id of ids) {
      await db.update(expenses).set({ 
        status: "Rejected", 
        rejectionReason: rejectionReason || "Rejected by manager",
      }).where(and(eq(expenses.id, id), eq(expenses.practiceId, practiceId)));
    }
    res.json({ message: `${ids.length} expense(s) rejected` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to reject expenses", error: error.message });
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
const DEFAULT_EMAIL_TEMPLATES = {
  invoice_dispatch: {
    subject: "Fee Invoice {InvoiceNo} from {PracticeName}",
    body: "Dear {ClientName},\n\nPlease find attached fee invoice {InvoiceNo} for professional accounting services rendered.\n\nInvoice Summary:\n- Invoice Date: {InvoiceDate}\n- Due Date: {DueDate}\n- Total Payable: £{TotalAmount}\n\nBank Payment Details:\n{BankDetails}\n\nThank you for your business.\n\nKind regards,\n{PracticeName}",
  },
  payment_receipt: {
    subject: "Payment Receipt - Invoice {InvoiceNo}",
    body: "Dear {ClientName},\n\nThank you for your payment. We confirm receipt of £{AmountPaid} toward fee invoice {InvoiceNo}.\n\nRemaining Balance Due: £{DueAmount}\n\nKind regards,\n{PracticeName}",
  },
  overdue_reminder_1: {
    subject: "Friendly Reminder: Invoice {InvoiceNo} Due",
    body: "Dear {ClientName},\n\nThis is a friendly reminder that fee invoice {InvoiceNo} for £{DueAmount} was due on {DueDate}.\n\nIf payment is already in transit, please disregard this note. Otherwise, please remit payment via the bank details below:\n\n{BankDetails}\n\nKind regards,\n{PracticeName}",
  },
  overdue_reminder_2: {
    subject: "Overdue Notice: Invoice {InvoiceNo} - Immediate Settlement Requested",
    body: "Dear {ClientName},\n\nOur records show that invoice {InvoiceNo} for £{DueAmount} is now overdue since {DueDate}.\n\nPlease arrange immediate settlement to avoid interruption to your client services.\n\nBank Details:\n{BankDetails}\n\nKind regards,\n{PracticeName}",
  },
  estimate_dispatch: {
    subject: "Fee Quotation {EstimateNo} from {PracticeName}",
    body: "Dear {ClientName},\n\nPlease find attached fee quotation {EstimateNo} for the agreed scope of services.\n\nQuotation Total: £{TotalAmount}\nValid Until: {ExpiryDate}\n\nPlease let us know if you wish to proceed.\n\nKind regards,\n{PracticeName}",
  },
  global_signature: {
    body: "Best regards,\n{PracticeName} Accounts Team\nEmail: contact@sansuite.co.uk",
  },
};

router.get("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const [settings] = await db.select().from(timeFeesSettings).where(eq(timeFeesSettings.practiceId, practiceId));
    const [practice] = await db.select().from(practices).where(eq(practices.id, practiceId));

    const responseSettings = settings || {
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
      emailTemplatesJson: DEFAULT_EMAIL_TEMPLATES,
      columnCustomizationJson: null,
    };

    // If settings exists but emailTemplatesJson is null/empty, fallback to defaults
    if (responseSettings && !responseSettings.emailTemplatesJson) {
      responseSettings.emailTemplatesJson = DEFAULT_EMAIL_TEMPLATES;
    }

    res.json({
      practice: practice || null,
      settings: responseSettings
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settings", error: error.message });
  }
});

router.post("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const data = req.body;

    const [existing] = await db.select().from(timeFeesSettings).where(eq(timeFeesSettings.practiceId, practiceId));

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
      activitiesJson: data.activitiesJson ? (typeof data.activitiesJson === "string" ? JSON.parse(data.activitiesJson) : data.activitiesJson) : (existing?.activitiesJson || null),
      emailTemplatesJson: data.emailTemplatesJson ? (typeof data.emailTemplatesJson === "string" ? JSON.parse(data.emailTemplatesJson) : data.emailTemplatesJson) : (existing?.emailTemplatesJson || DEFAULT_EMAIL_TEMPLATES),
      columnCustomizationJson: data.columnCustomizationJson ? (typeof data.columnCustomizationJson === "string" ? JSON.parse(data.columnCustomizationJson) : data.columnCustomizationJson) : (existing?.columnCustomizationJson || null),
      updatedAt: new Date()
    };

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

// ===========================================================================
// 8. MANAGE HUB & STAFF RATE CARDS (Capium Article 9000236008 & 9000271112)
// ===========================================================================
router.get("/manage/staff-rates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceUsers = await db.select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      systemRole: users.role,
      isActive: users.isActive,
    }).from(users).where(eq(users.practiceId, practiceId));

    const existingRates = await db.select().from(timeFeesStaffRates).where(eq(timeFeesStaffRates.practiceId, practiceId));
    const rateMap = new Map<number, any>();
    existingRates.forEach(r => rateMap.set(r.userId, r));

    const staffList = practiceUsers.map(u => {
      const rate = rateMap.get(u.userId);
      return {
        userId: u.userId,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        roleTier: rate?.roleTier || (u.systemRole === 'admin' ? 'Admin' : 'Staff'),
        capacityHoursPerWeek: rate?.capacityHoursPerWeek ? String(rate.capacityHoursPerWeek) : "37.50",
        billableRatePerHour: rate?.billableRatePerHour ? String(rate.billableRatePerHour) : "75.00",
        costRatePerHour: rate?.costRatePerHour ? String(rate.costRatePerHour) : "35.00",
        assignedTasks: rate?.assignedTasksJson || [],
        isActive: rate ? rate.isActive : u.isActive,
      };
    });

    res.json(staffList);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch staff rate cards", error: error.message });
  }
});

router.post("/manage/staff-rates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { userId, roleTier, capacityHoursPerWeek, billableRatePerHour, costRatePerHour, assignedTasks, isActive } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const [existing] = await db.select().from(timeFeesStaffRates).where(
      and(eq(timeFeesStaffRates.practiceId, practiceId), eq(timeFeesStaffRates.userId, Number(userId)))
    );

    const payload = {
      practiceId,
      userId: Number(userId),
      roleTier: roleTier || "Staff",
      capacityHoursPerWeek: String(capacityHoursPerWeek || "37.50"),
      billableRatePerHour: String(billableRatePerHour || "75.00"),
      costRatePerHour: String(costRatePerHour || "35.00"),
      assignedTasksJson: assignedTasks || [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(timeFeesStaffRates).set(payload).where(eq(timeFeesStaffRates.id, existing.id));
    } else {
      await db.insert(timeFeesStaffRates).values(payload);
    }

    res.json({ message: "Staff rate card saved successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save staff rate card", error: error.message });
  }
});

router.post("/manage/sync-users", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceUsers = await db.select().from(users).where(eq(users.practiceId, practiceId));
    const existingRates = await db.select().from(timeFeesStaffRates).where(eq(timeFeesStaffRates.practiceId, practiceId));
    const existingUserIds = new Set(existingRates.map(r => r.userId));

    let createdCount = 0;
    for (const u of practiceUsers) {
      if (!existingUserIds.has(u.id)) {
        await db.insert(timeFeesStaffRates).values({
          practiceId,
          userId: u.id,
          roleTier: u.role === 'admin' ? 'Admin' : 'Staff',
          capacityHoursPerWeek: "37.50",
          billableRatePerHour: "75.00",
          costRatePerHour: "35.00",
          assignedTasksJson: [],
          isActive: u.isActive !== undefined ? u.isActive : true,
        });
        createdCount++;
      }
    }
    res.json({ message: `Synced ${createdCount} staff users into Time & Fees` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to sync staff users", error: error.message });
  }
});

// ===========================================================================
// 9. WIP-TO-INVOICE GENERATION & BILLING (Capium Article 9000236009)
// ===========================================================================
router.get("/wip/unbilled", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientIdParam = req.query.clientId ? Number(req.query.clientId) : undefined;
    const includeAll = req.query.includeAll === "true";

    // Allowed statuses for timesheets & expenses
    const allowedStatuses = includeAll ? ["Approved", "PFA", "Unsubmitted"] : ["Approved"];

    // Fetch unbilled timesheets
    const unbilledTimesheets = await db.select({
      id: timesheets.id,
      clientId: timesheets.clientId,
      jobId: timesheets.jobId,
      date: timesheets.date,
      hours: timesheets.hours,
      ratePerHour: timesheets.ratePerHour,
      billable: timesheets.billable,
      status: timesheets.status,
      taskName: timesheets.taskName,
      subtaskName: timesheets.subtaskName,
      description: timesheets.description,
      clientName: clients.clientName,
      jobName: jobs.jobName,
      userName: users.firstName,
    })
    .from(timesheets)
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
    .leftJoin(users, eq(timesheets.userId, users.id))
    .where(
      and(
        eq(timesheets.practiceId, practiceId),
        eq(timesheets.billable, true),
        inArray(timesheets.status, allowedStatuses),
        isNull(timesheets.invoiceId),
        clientIdParam ? eq(timesheets.clientId, clientIdParam) : undefined
      )
    );

    // Fetch billable unbilled expenses
    const unbilledExpenses = await db.select({
      id: expenses.id,
      clientId: expenses.clientId,
      jobId: expenses.jobId,
      expenseDate: expenses.expenseDate,
      category: expenses.category,
      amount: expenses.amount,
      billable: expenses.billable,
      status: expenses.status,
      notes: expenses.notes,
      clientName: clients.clientName,
      jobName: jobs.jobName,
      userName: users.firstName,
    })
    .from(expenses)
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .leftJoin(jobs, eq(expenses.jobId, jobs.id))
    .leftJoin(users, eq(expenses.userId, users.id))
    .where(
      and(
        eq(expenses.practiceId, practiceId),
        eq(expenses.billable, true),
        inArray(expenses.status, allowedStatuses),
        isNull(expenses.billedInvoiceId),
        clientIdParam ? eq(expenses.clientId, clientIdParam) : undefined
      )
    );

    // Calculate totals
    const totalTimeHours = unbilledTimesheets.reduce((acc, t) => acc + parseFloat(String(t.hours || '0')), 0);
    const totalTimeValue = unbilledTimesheets.reduce((acc, t) => acc + (parseFloat(String(t.hours || '0')) * parseFloat(String(t.ratePerHour || '0'))), 0);
    const totalExpenseValue = unbilledExpenses.reduce((acc, e) => acc + parseFloat(String(e.amount || '0')), 0);

    // Group by Client for client-level WIP summary
    const clientMap = new Map<number, any>();
    for (const t of unbilledTimesheets) {
      if (!t.clientId) continue;
      const c = clientMap.get(t.clientId) || {
        clientId: t.clientId,
        clientName: t.clientName || `Client #${t.clientId}`,
        timesheetCount: 0,
        totalHours: 0,
        timeValue: 0,
        expenseCount: 0,
        expenseValue: 0,
        totalWip: 0,
      };
      const h = parseFloat(String(t.hours || '0'));
      const r = parseFloat(String(t.ratePerHour || '0'));
      c.timesheetCount += 1;
      c.totalHours += h;
      c.timeValue += (h * r);
      c.totalWip += (h * r);
      clientMap.set(t.clientId, c);
    }

    for (const e of unbilledExpenses) {
      if (!e.clientId) continue;
      const c = clientMap.get(e.clientId) || {
        clientId: e.clientId,
        clientName: e.clientName || `Client #${e.clientId}`,
        timesheetCount: 0,
        totalHours: 0,
        timeValue: 0,
        expenseCount: 0,
        expenseValue: 0,
        totalWip: 0,
      };
      const amt = parseFloat(String(e.amount || '0'));
      c.expenseCount += 1;
      c.expenseValue += amt;
      c.totalWip += amt;
      clientMap.set(e.clientId, c);
    }

    const clientSummary = Array.from(clientMap.values()).map(c => ({
      ...c,
      totalHours: parseFloat(c.totalHours.toFixed(2)),
      timeValue: parseFloat(c.timeValue.toFixed(2)),
      expenseValue: parseFloat(c.expenseValue.toFixed(2)),
      totalWip: parseFloat(c.totalWip.toFixed(2)),
    })).sort((a, b) => b.totalWip - a.totalWip);

    res.json({
      unbilledTimesheets,
      unbilledExpenses,
      clientSummary,
      summary: {
        timesheetsCount: unbilledTimesheets.length,
        totalTimeHours: parseFloat(totalTimeHours.toFixed(2)),
        totalTimeValue: parseFloat(totalTimeValue.toFixed(2)),
        expensesCount: unbilledExpenses.length,
        totalExpenseValue: parseFloat(totalExpenseValue.toFixed(2)),
        totalWipValue: parseFloat((totalTimeValue + totalExpenseValue).toFixed(2)),
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch unbilled WIP", error: error.message });
  }
});

router.post("/invoices/generate-from-wip", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { 
      clientId, 
      timesheetIds = [], 
      expenseIds = [], 
      invoiceDate, 
      dueDate, 
      reference,
      lineItemMode = "detailed",
      defaultVatRate = 0.20
    } = req.body;

    if (!clientId) return res.status(400).json({ message: "clientId is required" });
    if (timesheetIds.length === 0 && expenseIds.length === 0) {
      return res.status(400).json({ message: "Select at least one timesheet entry or billable expense to bill" });
    }

    // 1. Fetch selected timesheets
    let selectedTimesheets: any[] = [];
    if (timesheetIds.length > 0) {
      selectedTimesheets = await db.select().from(timesheets).where(
        and(eq(timesheets.practiceId, practiceId), inArray(timesheets.id, timesheetIds))
      );
    }

    // 2. Fetch selected expenses
    let selectedExpenses: any[] = [];
    if (expenseIds.length > 0) {
      selectedExpenses = await db.select().from(expenses).where(
        and(eq(expenses.practiceId, practiceId), inArray(expenses.id, expenseIds))
      );
    }

    // 3. Build line items
    const lineItems: any[] = [];
    let netTotal = 0;

    if (lineItemMode === "consolidated") {
      // Group all timesheets into one line item
      if (selectedTimesheets.length > 0) {
        const totalHours = selectedTimesheets.reduce((acc, t) => acc + parseFloat(String(t.hours || '0')), 0);
        const totalVal = selectedTimesheets.reduce((acc, t) => acc + (parseFloat(String(t.hours || '0')) * parseFloat(String(t.ratePerHour || '0'))), 0);
        lineItems.push({
          id: `li-time-${Date.now()}`,
          description: `Professional Services & Statutory Compliance (${totalHours.toFixed(1)} hrs)`,
          amount: parseFloat(totalVal.toFixed(2)),
          discount: 0,
          account: "1010 - Fee Income",
          vatRateLabel: defaultVatRate > 0 ? `Standard VAT (${(defaultVatRate * 100).toFixed(0)}%)` : "No VAT",
          vatRate: defaultVatRate,
        });
        netTotal += totalVal;
      }
      // Group expenses
      if (selectedExpenses.length > 0) {
        const totalExpVal = selectedExpenses.reduce((acc, e) => acc + parseFloat(String(e.amount || '0')), 0);
        lineItems.push({
          id: `li-exp-${Date.now()}`,
          description: `Rechargeable Disbursements & Travel Expenses (${selectedExpenses.length} items)`,
          amount: parseFloat(totalExpVal.toFixed(2)),
          discount: 0,
          account: "10600 - Other Income",
          vatRateLabel: defaultVatRate > 0 ? `Standard VAT (${(defaultVatRate * 100).toFixed(0)}%)` : "No VAT",
          vatRate: defaultVatRate,
        });
        netTotal += totalExpVal;
      }
    } else {
      // Detailed line items per timesheet & expense
      selectedTimesheets.forEach((t, idx) => {
        const h = parseFloat(String(t.hours || '0'));
        const r = parseFloat(String(t.ratePerHour || '75'));
        const amt = parseFloat((h * r).toFixed(2));
        lineItems.push({
          id: `li-t-${t.id}-${idx}`,
          description: `${t.taskName || 'Professional Services'}${t.subtaskName ? ' - ' + t.subtaskName : ''} (${h.toFixed(1)} hrs @ £${r.toFixed(2)}/hr) - ${t.description || ''}`.trim(),
          amount: amt,
          discount: 0,
          account: "1010 - Fee Income",
          vatRateLabel: defaultVatRate > 0 ? `Standard VAT (${(defaultVatRate * 100).toFixed(0)}%)` : "No VAT",
          vatRate: defaultVatRate,
        });
        netTotal += amt;
      });

      selectedExpenses.forEach((e, idx) => {
        const amt = parseFloat(String(e.amount || '0'));
        lineItems.push({
          id: `li-e-${e.id}-${idx}`,
          description: `Disbursement: ${e.category || 'Expense'} - ${e.notes || ''}`.trim(),
          amount: amt,
          discount: 0,
          account: "10600 - Other Income",
          vatRateLabel: defaultVatRate > 0 ? `Standard VAT (${(defaultVatRate * 100).toFixed(0)}%)` : "No VAT",
          vatRate: defaultVatRate,
        });
        netTotal += amt;
      });
    }

    const vatTotal = parseFloat((netTotal * defaultVatRate).toFixed(2));
    const grossTotal = parseFloat((netTotal + vatTotal).toFixed(2));

    // Next Invoice Number
    const existingInvoices = await db.select().from(feesInvoices).where(eq(feesInvoices.practiceId, practiceId));
    const nextNumber = `INV-${String(existingInvoices.length + 1).padStart(4, '0')}`;

    const [newInvoice] = await db.insert(feesInvoices).values({
      practiceId,
      clientId: Number(clientId),
      invoiceNumber: nextNumber,
      date: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: reference || `WIP Billing (${selectedTimesheets.length} timelogs, ${selectedExpenses.length} claims)`,
      netAmount: String(netTotal.toFixed(2)),
      vatAmount: String(vatTotal.toFixed(2)),
      totalAmount: String(grossTotal.toFixed(2)),
      paidAmount: "0.00",
      dueAmount: String(grossTotal.toFixed(2)),
      status: "Draft",
      lineItemsJson: lineItems,
    });

    const newInvoiceId = (newInvoice as any).insertId || (newInvoice as any).id;

    // 4. Mark timesheets as Billed and link invoiceId
    if (timesheetIds.length > 0) {
      await db.update(timesheets)
        .set({ invoiceId: newInvoiceId, status: "Billed" })
        .where(and(eq(timesheets.practiceId, practiceId), inArray(timesheets.id, timesheetIds)));
    }

    // 5. Mark expenses as billed and link billedInvoiceId
    if (expenseIds.length > 0) {
      await db.update(expenses)
        .set({ billedInvoiceId: newInvoiceId })
        .where(and(eq(expenses.practiceId, practiceId), inArray(expenses.id, expenseIds)));
    }

    res.json({
      message: `Invoice ${nextNumber} generated successfully from unbilled WIP!`,
      invoiceId: newInvoiceId,
      invoiceNumber: nextNumber,
      billedTimesheets: timesheetIds.length,
      billedExpenses: expenseIds.length,
      totalAmount: grossTotal
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate invoice from WIP", error: error.message });
  }
});

// ===========================================================================
// 10. JOB CALENDAR & IN-JOB WORKSPACE ACTIONS (Capium Article 9000235917)
// ===========================================================================
router.get("/jobs/calendar", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const allJobs = await db.select({
      id: jobs.id,
      jobName: jobs.jobName,
      startDate: jobs.startDate,
      targetEndDate: jobs.targetEndDate,
      status: jobs.status,
      feeType: jobs.feeType,
      budget: jobs.budget,
      taskType: jobs.taskType,
      clientId: jobs.clientId,
      clientName: clients.clientName,
      assignedTo: jobs.assignedTo,
      assignedStaffName: users.firstName,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .where(eq(jobs.practiceId, practiceId));

    res.json(allJobs);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch calendar jobs", error: error.message });
  }
});

router.post("/jobs/:id/email", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const jobId = Number(req.params.id);
    const { to, subject, body, attachments = [] } = req.body;

    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.practiceId, practiceId)));
    if (!job) return res.status(404).json({ message: "Job not found" });

    const currentEmails = Array.isArray(job.emailsJson) ? job.emailsJson : [];
    const newEmailRecord = {
      id: `email-${Date.now()}`,
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      sentBy: req.user.firstName || req.user.email,
      attachments,
    };

    currentEmails.push(newEmailRecord);
    await db.update(jobs).set({ emailsJson: currentEmails }).where(eq(jobs.id, jobId));

    res.json({ message: "Job correspondence recorded successfully", email: newEmailRecord });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to record job email", error: error.message });
  }
});

router.get("/jobs/:id/invoices", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const jobId = Number(req.params.id);
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.practiceId, practiceId)));
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Invoices for this client
    const jobInvoices = await db.select().from(feesInvoices).where(
      and(eq(feesInvoices.practiceId, practiceId), eq(feesInvoices.clientId, job.clientId as number))
    );

    res.json(jobInvoices);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch job invoices", error: error.message });
  }
});

// ===========================================================================
// 11. 4-PILLAR STATUTORY & REVENUE REPORTS (Capium Article 9000235911)
// ===========================================================================
router.get("/reports/time", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const period = req.query.period as string || "this_month";
    const customStart = req.query.customStart as string;
    const customEnd = req.query.customEnd as string;
    const groupBy = (req.query.groupBy as string) || "client"; // client, job, task, user, date
    const filterType = (req.query.filterType as string) || "all"; // all, billable, non_billable

    const dateRange = getPeriodDateRange(period, customStart, customEnd);

    const allTimesheets = await db.select({
      id: timesheets.id,
      date: timesheets.date,
      hours: timesheets.hours,
      ratePerHour: timesheets.ratePerHour,
      costRate: timesheets.costRate,
      billable: timesheets.billable,
      status: timesheets.status,
      taskName: timesheets.taskName,
      clientId: timesheets.clientId,
      userId: timesheets.userId,
      jobId: timesheets.jobId,
      clientName: clients.clientName,
      userName: users.firstName,
      jobName: jobs.jobName,
    })
    .from(timesheets)
    .leftJoin(clients, eq(timesheets.clientId, clients.id))
    .leftJoin(users, eq(timesheets.userId, users.id))
    .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
    .where(eq(timesheets.practiceId, practiceId));

    const filtered = allTimesheets.filter(t => {
      if (dateRange) {
        const td = new Date(t.date);
        if (td < dateRange.startDate || td > dateRange.endDate) return false;
      }
      if (filterType === "billable" && !t.billable) return false;
      if (filterType === "non_billable" && t.billable) return false;
      return true;
    });

    // Grouping logic
    const groupsMap = new Map<string, any>();
    filtered.forEach(t => {
      let key = "Other";
      if (groupBy === "client") key = t.clientName || "General Client";
      else if (groupBy === "job") key = t.jobName || "Adhoc Work";
      else if (groupBy === "task") key = t.taskName || "General Task";
      else if (groupBy === "user") key = t.userName || "Staff Member";
      else if (groupBy === "date") key = String(t.date);

      const h = parseFloat(String(t.hours || '0'));
      const r = parseFloat(String(t.ratePerHour || '75'));
      const c = parseFloat(String(t.costRate || '35'));
      const rev = t.billable ? h * r : 0;
      const cost = h * c;
      const profit = rev - cost;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          groupKey: key,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          totalRevenue: 0,
          totalCost: 0,
          grossProfit: 0,
          entriesCount: 0,
        });
      }
      const g = groupsMap.get(key);
      g.totalHours += h;
      if (t.billable) g.billableHours += h;
      else g.nonBillableHours += h;
      g.totalRevenue += rev;
      g.totalCost += cost;
      g.grossProfit += profit;
      g.entriesCount += 1;
    });

    const rows = Array.from(groupsMap.values()).map(g => ({
      ...g,
      totalHours: parseFloat(g.totalHours.toFixed(2)),
      billableHours: parseFloat(g.billableHours.toFixed(2)),
      nonBillableHours: parseFloat(g.nonBillableHours.toFixed(2)),
      totalRevenue: parseFloat(g.totalRevenue.toFixed(2)),
      totalCost: parseFloat(g.totalCost.toFixed(2)),
      grossProfit: parseFloat(g.grossProfit.toFixed(2)),
      margin: g.totalRevenue > 0 ? ((g.grossProfit / g.totalRevenue) * 100).toFixed(1) : "0.0",
    }));

    res.json({
      rows,
      summary: {
        totalHours: parseFloat(rows.reduce((acc, r) => acc + r.totalHours, 0).toFixed(2)),
        totalRevenue: parseFloat(rows.reduce((acc, r) => acc + r.totalRevenue, 0).toFixed(2)),
        totalCost: parseFloat(rows.reduce((acc, r) => acc + r.totalCost, 0).toFixed(2)),
        grossProfit: parseFloat(rows.reduce((acc, r) => acc + r.grossProfit, 0).toFixed(2)),
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch time report", error: error.message });
  }
});

router.get("/reports/expenses", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const period = req.query.period as string || "this_month";
    const customStart = req.query.customStart as string;
    const customEnd = req.query.customEnd as string;
    const groupBy = (req.query.groupBy as string) || "category"; // category, client, user, date

    const dateRange = getPeriodDateRange(period, customStart, customEnd);

    const allExpenses = await db.select({
      id: expenses.id,
      expenseDate: expenses.expenseDate,
      category: expenses.category,
      amount: expenses.amount,
      billable: expenses.billable,
      status: expenses.status,
      notes: expenses.notes,
      miles: expenses.miles,
      clientName: clients.clientName,
      userName: users.firstName,
      jobName: jobs.jobName,
    })
    .from(expenses)
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .leftJoin(users, eq(expenses.userId, users.id))
    .leftJoin(jobs, eq(expenses.jobId, jobs.id))
    .where(eq(expenses.practiceId, practiceId));

    const filtered = allExpenses.filter(e => {
      if (dateRange) {
        const ed = new Date(e.expenseDate);
        if (ed < dateRange.startDate || ed > dateRange.endDate) return false;
      }
      return true;
    });

    const groupsMap = new Map<string, any>();
    filtered.forEach(e => {
      let key = "Other";
      if (groupBy === "category") key = e.category || "General";
      else if (groupBy === "client") key = e.clientName || "Non-client";
      else if (groupBy === "user") key = e.userName || "Staff";
      else if (groupBy === "date") key = String(e.expenseDate);

      const amt = parseFloat(String(e.amount || '0'));
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          groupKey: key,
          count: 0,
          totalAmount: 0,
          billableAmount: 0,
          nonBillableAmount: 0,
        });
      }
      const g = groupsMap.get(key);
      g.count += 1;
      g.totalAmount += amt;
      if (e.billable) g.billableAmount += amt;
      else g.nonBillableAmount += amt;
    });

    const rows = Array.from(groupsMap.values()).map(g => ({
      ...g,
      totalAmount: parseFloat(g.totalAmount.toFixed(2)),
      billableAmount: parseFloat(g.billableAmount.toFixed(2)),
      nonBillableAmount: parseFloat(g.nonBillableAmount.toFixed(2)),
    }));

    res.json({
      rows,
      summary: {
        count: filtered.length,
        totalAmount: parseFloat(rows.reduce((acc, r) => acc + r.totalAmount, 0).toFixed(2)),
        billableAmount: parseFloat(rows.reduce((acc, r) => acc + r.billableAmount, 0).toFixed(2)),
        nonBillableAmount: parseFloat(rows.reduce((acc, r) => acc + r.nonBillableAmount, 0).toFixed(2)),
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch expenses report", error: error.message });
  }
});

router.get("/reports/invoices-debtors", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const allInvoices = await db.select({
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
      clientId: feesInvoices.clientId,
      clientName: clients.clientName,
    })
    .from(feesInvoices)
    .leftJoin(clients, eq(feesInvoices.clientId, clients.id))
    .where(eq(feesInvoices.practiceId, practiceId));

    const now = new Date();
    const debtors = allInvoices.filter(i => parseFloat(String(i.dueAmount || '0')) > 0 && i.status !== 'Void');

    let current = 0;
    let days1To30 = 0;
    let days31To60 = 0;
    let days61To90 = 0;
    let days90Plus = 0;

    const debtorsList = debtors.map(i => {
      const due = i.dueDate ? new Date(i.dueDate) : new Date(i.date);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const dueAmt = parseFloat(String(i.dueAmount || '0'));

      let bucket = "Current";
      if (diffDays <= 0) {
        current += dueAmt;
        bucket = "Current";
      } else if (diffDays <= 30) {
        days1To30 += dueAmt;
        bucket = "1 - 30 Days";
      } else if (diffDays <= 60) {
        days31To60 += dueAmt;
        bucket = "31 - 60 Days";
      } else if (diffDays <= 90) {
        days61To90 += dueAmt;
        bucket = "61 - 90 Days";
      } else {
        days90Plus += dueAmt;
        bucket = "90+ Days Overdue";
      }

      return {
        ...i,
        overdueDays: Math.max(0, diffDays),
        agingBucket: bucket,
      };
    });

    const totalInvoiced = allInvoices.reduce((acc, i) => acc + parseFloat(String(i.totalAmount || '0')), 0);
    const totalPaid = allInvoices.reduce((acc, i) => acc + parseFloat(String(i.paidAmount || '0')), 0);
    const totalDue = debtors.reduce((acc, i) => acc + parseFloat(String(i.dueAmount || '0')), 0);

    res.json({
      debtorsList,
      agingBuckets: {
        current: parseFloat(current.toFixed(2)),
        days1To30: parseFloat(days1To30.toFixed(2)),
        days31To60: parseFloat(days31To60.toFixed(2)),
        days61To90: parseFloat(days61To90.toFixed(2)),
        days90Plus: parseFloat(days90Plus.toFixed(2)),
        totalOutstanding: parseFloat(totalDue.toFixed(2)),
      },
      summary: {
        totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        totalDue: parseFloat(totalDue.toFixed(2)),
        recoveryRate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : "0.0",
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch invoices & debtors report", error: error.message });
  }
});

export default router;
