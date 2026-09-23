import { Router } from "express";
import { db } from "../db";
import {
  portalLicenses, portalClientInvitations, portalUsers, users, clients,
  salesInvoices, payRuns, payslips, purchases, bankAccounts, practices,
  pmDocumentRequests, payeSchemes, employees
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authMiddleware, signJwt } from "../lib/authUtils";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import multer from "multer";

const DOC_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "client-documents");
if (!fs.existsSync(DOC_UPLOAD_DIR)) {
  fs.mkdirSync(DOC_UPLOAD_DIR, { recursive: true });
}

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOC_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const uploadDoc = multer({ storage: docStorage, limits: { fileSize: 25 * 1024 * 1024 } });

const router = Router();

// Accept invitation (Public endpoint for client portal onboarding)
router.post("/accept-invite", async (req: any, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }
    
    const [invitation] = await db.select().from(portalClientInvitations).where(eq(portalClientInvitations.token, token));
    
    if (!invitation || invitation.status !== "Pending") {
      return res.status(400).json({ message: "Invalid or expired invitation token" });
    }

    if (!invitation.clientId) {
      return res.status(400).json({ message: "Invitation is not linked to a valid client" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [client] = await db.select().from(clients).where(eq(clients.id, invitation.clientId));

    // Upsert portal user record
    const [existingUser] = await db.select().from(portalUsers).where(eq(portalUsers.email, invitation.inviteEmail || ""));
    let portalUserId = existingUser?.id;

    const portalType = invitation.portalType || "365";

    if (existingUser) {
      await db.update(portalUsers)
        .set({
          passwordHash,
          clientId: invitation.clientId,
          practiceId: invitation.practiceId,
          portalType,
          isActive: true,
          lastLogin: new Date(),
        })
        .where(eq(portalUsers.id, existingUser.id));
    } else {
      const [created] = await db.insert(portalUsers).values({
        practiceId: invitation.practiceId,
        clientId: invitation.clientId,
        email: invitation.inviteEmail || "",
        passwordHash,
        firstName: client?.clientName || "Client",
        portalType,
        isActive: true,
        lastLogin: new Date(),
      });
      portalUserId = created.insertId;
    }
    
    await db.update(portalClientInvitations)
      .set({ status: "Accepted", acceptedAt: new Date() })
      .where(eq(portalClientInvitations.id, invitation.id));
      
    // Deduct license count
    const licenseType = portalType === "sme" ? "SmePortal" : "Portal365";
    const [license] = await db.select().from(portalLicenses).where(
      and(
        eq(portalLicenses.practiceId, invitation.practiceId),
        eq(portalLicenses.licenseType, licenseType)
      )
    );
    
    if (license) {
      await db.update(portalLicenses).set({ usedCount: (license.usedCount || 0) + 1 }).where(eq(portalLicenses.id, license.id));
    }

    const sessionToken = signJwt({
      id: portalUserId,
      email: invitation.inviteEmail,
      firstName: client?.clientName || "Client",
      role: portalType === "sme" ? "sme_client" : "portal_client",
      portalType,
      practiceId: invitation.practiceId,
      clientId: invitation.clientId,
      isPortalUser: true,
    });
    
    res.json({
      message: "Invitation accepted successfully. Client portal active!",
      token: sessionToken,
      portalType,
      user: {
        id: portalUserId,
        email: invitation.inviteEmail,
        firstName: client?.clientName || "Client",
        role: portalType === "sme" ? "sme_client" : "portal_client",
        portalType,
        practiceId: invitation.practiceId,
        clientId: invitation.clientId,
        clientName: client?.clientName || "Client",
        isPortalUser: true,
      }
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// All following endpoints require auth
router.use(authMiddleware);

router.get("/licenses", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    let licenses = await db.select()
      .from(portalLicenses)
      .where(eq(portalLicenses.practiceId, practiceId));
      
    if (licenses.length === 0) {
      await db.insert(portalLicenses).values([
        { practiceId, licenseType: "Portal365", totalAllocated: 50, usedCount: 0 },
        { practiceId, licenseType: "MtdIt", totalAllocated: 50, usedCount: 0 }
      ]);
      licenses = await db.select()
        .from(portalLicenses)
        .where(eq(portalLicenses.practiceId, practiceId));
    }
    
    res.json(licenses);
  } catch (error) {
    console.error("Failed to fetch licenses:", error);
    res.status(500).json({ message: "Failed to fetch licenses" });
  }
});

router.get("/invitations", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select({
      id: portalClientInvitations.id,
      clientId: clients.id,
      clientName: clients.clientName,
      inviteEmail: portalClientInvitations.inviteEmail,
      status: portalClientInvitations.status,
      portalType: portalClientInvitations.portalType,
      token: portalClientInvitations.token,
      invitedAt: portalClientInvitations.invitedAt,
    })
    .from(portalClientInvitations)
    .innerJoin(clients, eq(portalClientInvitations.clientId, clients.id))
    .where(eq(portalClientInvitations.practiceId, practiceId));
    
    res.json(result);
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
});

router.post("/invite", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, inviteEmail, portalType, permissions } = req.body;
    
    if (!clientId || !inviteEmail) {
      return res.status(400).json({ message: "Client ID and Email are required" });
    }
    
    const token = crypto.randomBytes(32).toString('hex');

    const [result] = await db.insert(portalClientInvitations).values({
      practiceId,
      clientId: parseInt(clientId),
      inviteEmail,
      token,
      portalType: portalType || "365",
      permissionsJson: permissions ? JSON.stringify(permissions) : null,
      status: "Pending",
    });
    
    res.json({
      id: result.insertId,
      token,
      portalType: portalType || "365",
      activationUrl: `/portal/accept/${token}`,
      message: "Invitation sent successfully"
    });
  } catch (error) {
    console.error("Failed to invite client:", error);
    res.status(500).json({ message: "Failed to invite client" });
  }
});

// Client Portal Overview (Invoices & Payslips summary for client)
router.get("/client-overview/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const invoices = await db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.clientId, clientId))
      .orderBy(desc(salesInvoices.createdAt));

    // Authentic payslip count from payroll tables (Zero Mock Data)
    let recentPayslipsCount = 0;
    try {
      const [scheme] = await db.select().from(payeSchemes).where(eq(payeSchemes.clientId, clientId));
      if (scheme) {
        const schemeRuns = await db.select().from(payRuns).where(eq(payRuns.payeSchemeId, scheme.id));
        const runIds = schemeRuns.map(r => r.id);
        if (runIds.length > 0) {
          const payslipRows = await db.select({ id: payslips.id }).from(payslips).where(inArray(payslips.payRunId, runIds));
          recentPayslipsCount = payslipRows.length;
        }
      }
    } catch (_) {}

    res.json({
      client: {
        id: client.id,
        name: client.clientName,
        email: client.email,
        type: client.clientType,
      },
      invoices,
      recentPayslipsCount,
      documentsCount: invoices.length,
    });
  } catch (error) {
    console.error("Failed to fetch portal client overview:", error);
    res.status(500).json({ message: "Failed to fetch client overview" });
  }
});

// Authenticated client's personal workspace data (for 365 & SME portals)
router.get("/my-workspace", async (req: any, res) => {
  try {
    const clientId = req.user.clientId || (req.query.clientId ? parseInt(req.query.clientId) : null);
    if (!clientId) {
      return res.status(400).json({ message: "No client bound to active session" });
    }

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const [practice] = await db.select().from(practices).where(eq(practices.id, client.practiceId));

    // Live counts & aggregates
    const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.clientId, clientId)).orderBy(desc(salesInvoices.id)).limit(20);
    const clientPurchases = await db.select().from(purchases).where(eq(purchases.clientId, clientId)).orderBy(desc(purchases.id)).limit(20);
    const clientBankAccounts = await db.select().from(bankAccounts).where(eq(bankAccounts.clientId, clientId));

    // Calculate totals
    const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0);
    const totalExpenses = clientPurchases.reduce((acc, p) => acc + Number(p.grandTotal || 0), 0);
    const bankBalance = clientBankAccounts.reduce((acc, b) => acc + Number(b.currentBalance || 0), 0);

    // Document requests
    const docRequests = await db.select().from(pmDocumentRequests).where(eq(pmDocumentRequests.clientId, clientId)).orderBy(desc(pmDocumentRequests.id)).limit(10);

    // Authentic client employee payslips (Zero Mock Data)
    let clientPayslips: any[] = [];
    try {
      const [scheme] = await db.select().from(payeSchemes).where(eq(payeSchemes.clientId, clientId));
      if (scheme) {
        const schemeRuns = await db.select().from(payRuns).where(eq(payRuns.payeSchemeId, scheme.id));
        const runIds = schemeRuns.map(r => r.id);
        if (runIds.length > 0) {
          clientPayslips = await db.select({
            id: payslips.id,
            employeeId: payslips.employeeId,
            employeeName: sql`CONCAT(COALESCE(${employees.firstName}, ''), ' ', COALESCE(${employees.lastName}, ''))`,
            taxMonth: payRuns.payPeriod,
            taxYear: payRuns.taxYear,
            grossPay: payslips.grossPay,
            netPay: payslips.netPay,
            taxDeducted: payslips.incomeTax,
            employeeNi: payslips.employeeNi,
            paymentDate: payRuns.paymentDate,
            createdAt: payslips.createdAt,
          })
          .from(payslips)
          .innerJoin(employees, eq(payslips.employeeId, employees.id))
          .innerJoin(payRuns, eq(payslips.payRunId, payRuns.id))
          .where(inArray(payslips.payRunId, runIds))
          .orderBy(desc(payslips.id))
          .limit(25);
        }
      }
    } catch (_) {}

    res.json({
      client: {
        id: client.id,
        name: client.clientName,
        code: client.clientCode,
        email: client.email,
        phone: client.phone,
        type: client.clientType,
        companyNumber: client.registrationNumber,
        vatNumber: client.vatNumber,
      },
      accountant: {
        firmName: practice?.name || "SanSuite Practice",
      },
      stats: {
        totalInvoiced,
        totalExpenses,
        bankBalance,
        invoicesCount: invoices.length,
        purchasesCount: clientPurchases.length,
        bankAccountsCount: clientBankAccounts.length,
        payslipsCount: clientPayslips.length,
        pendingDocRequestsCount: docRequests.filter(d => d.status !== "Completed").length,
      },
      invoices,
      purchases: clientPurchases,
      bankAccounts: clientBankAccounts,
      documentRequests: docRequests,
      payslips: clientPayslips,
    });
  } catch (error) {
    console.error("Failed to fetch client workspace:", error);
    res.status(500).json({ message: "Failed to fetch workspace data" });
  }
});

// POST /api/portal/document-requests/:id/upload — Client document fulfillment
router.post("/document-requests/:id/upload", uploadDoc.single("file"), async (req: any, res) => {
  try {
    const requestId = parseInt(req.params.id);
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const fileUrl = `/uploads/client-documents/${req.file.filename}`;
    const [docReq] = await db.select().from(pmDocumentRequests).where(eq(pmDocumentRequests.id, requestId));
    if (!docReq) {
      return res.status(404).json({ message: "Document request not found." });
    }

    await db.update(pmDocumentRequests)
      .set({
        status: "Completed",
        completedAt: new Date(),
        description: docReq.description ? `${docReq.description}\n[Uploaded file: ${fileUrl}]` : `Uploaded file: ${fileUrl}`,
      })
      .where(eq(pmDocumentRequests.id, requestId));

    res.json({
      message: "Document uploaded successfully and request fulfilled!",
      fileUrl,
      fileName: req.file.originalname,
    });
  } catch (error: any) {
    console.error("Failed to upload document request:", error);
    res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
});

// Client receipt / docscan upload
router.post("/my-receipts", async (req: any, res) => {
  try {
    const clientId = req.user.clientId || parseInt(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: "Client ID required" });

    const { supplierName, billNumber, billDate, amount, vatAmount, notes, fileUrl } = req.body;
    if (!supplierName || !amount) {
      return res.status(400).json({ message: "Supplier name and amount are required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const total = (Number(amount) + Number(vatAmount || 0)).toFixed(2);

    const [created] = await db.insert(purchases).values({
      clientId,
      billNumber: billNumber || `REC-${Date.now().toString().slice(-6)}`,
      billDate: (billDate || todayStr) as any,
      subTotal: Number(amount).toFixed(2),
      vatTotal: Number(vatAmount || 0).toFixed(2),
      grandTotal: total,
      status: "Unpaid",
      notes: notes || (fileUrl ? `Supplier: ${supplierName}. Uploaded from 365 Portal. Document: ${fileUrl}` : `Supplier: ${supplierName}. Uploaded from 365 Portal`),
    });

    res.json({ id: created.insertId, message: "Receipt uploaded successfully and bridged to accountant" });
  } catch (error) {
    console.error("Failed to upload receipt:", error);
    res.status(500).json({ message: "Failed to upload receipt" });
  }
});

// Client sales invoice creation
router.post("/my-invoices", async (req: any, res) => {
  try {
    const clientId = req.user.clientId || parseInt(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: "Client ID required" });

    const { customerName, invoiceNumber, invoiceDate, dueDate, totalAmount, vatAmount, notes } = req.body;
    if (!customerName || !totalAmount) {
      return res.status(400).json({ message: "Customer name and total amount are required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const dueStr = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const grand = (Number(totalAmount) + Number(vatAmount || 0)).toFixed(2);

    const [created] = await db.insert(salesInvoices).values({
      clientId,
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: (invoiceDate || todayStr) as any,
      dueDate: (dueDate || dueStr) as any,
      subTotal: Number(totalAmount).toFixed(2),
      vatTotal: Number(vatAmount || 0).toFixed(2),
      grandTotal: grand,
      paidAmount: "0.00",
      status: "Draft",
      notes: notes || `Customer: ${customerName}. Created from Client Portal`,
    });

    res.json({ id: created.insertId, message: "Invoice created successfully" });
  } catch (error) {
    console.error("Failed to create client invoice:", error);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

// Default permissions matrix definition for 365 Portal
const DEFAULT_PERMISSIONS_MATRIX: Record<string, { admin: string; manager: string; regular: string }> = {
  permissions: { admin: "Full", manager: "None", regular: "None" },
  dashboard: { admin: "Full", manager: "Full", regular: "Full" },
  drive: { admin: "Full", manager: "Full", regular: "Full" },
  manage: { admin: "Full", manager: "Full", regular: "Full" },
  clients: { admin: "Full", manager: "Full", regular: "Full" },
  users: { admin: "Full", manager: "None", regular: "None" },
  imports: { admin: "Full", manager: "None", regular: "None" },
  manage_permissions: { admin: "Full", manager: "None", regular: "None" },
  activity: { admin: "Full", manager: "None", regular: "None" },
  setting: { admin: "Full", manager: "None", regular: "None" },
  my_business: { admin: "Full", manager: "None", regular: "None" },
  demo_data: { admin: "Full", manager: "None", regular: "None" },
  announcement: { admin: "Full", manager: "None", regular: "None" },
};

let portalPermissionsMatrix: any = { ...DEFAULT_PERMISSIONS_MATRIX };

let isPortalMatrixTableChecked = false;
async function ensurePortalMatrixTable() {
  if (isPortalMatrixTableChecked) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portal_permissions_matrix (
        id INT AUTO_INCREMENT PRIMARY KEY,
        practice_id INT NOT NULL DEFAULT 1,
        matrix_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_practice (practice_id)
      )
    `);
    isPortalMatrixTableChecked = true;
  } catch (err) {
    console.error("Failed to ensure portal_permissions_matrix table:", err);
  }
}

// GET /api/portal/staff-users - List practice users for 365
router.get("/staff-users", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const staffList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        permissionsJson: users.permissionsJson,
      })
      .from(users)
      .where(eq(users.practiceId, practiceId))
      .orderBy(desc(users.id));

    // Find practice owner or primary admin for creator reference
    const ownerUser = staffList.find(s => s.role === "admin" || (s.permissionsJson && s.permissionsJson.includes("Owner"))) || staffList[staffList.length - 1];
    const creatorName = ownerUser ? `${ownerUser.firstName || ""} ${ownerUser.lastName || ""}`.trim() || "Administrator" : "Administrator";

    const formatted = staffList.map((u, index) => {
      let parsedPerms: any = {};
      try {
        if (u.permissionsJson) parsedPerms = JSON.parse(u.permissionsJson);
      } catch (e) {}

      const userCode = `U${String(staffList.length - index).padStart(2, "0")}`;
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      
      // Determine permission role label
      let permissionLabel = "Regular User";
      if (u.role === "admin" || parsedPerms.portalPermission === "Owner") {
        permissionLabel = index === staffList.length - 1 ? "Owner" : "Administrator";
      } else if (parsedPerms.portalPermission === "Administrator") {
        permissionLabel = "Administrator";
      } else if (parsedPerms.portalPermission === "Manager" || u.role === "accountant") {
        permissionLabel = "Manager";
      }

      return {
        id: u.id,
        userCode,
        fullName,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        phone: u.phone || "",
        createdOn: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent",
        createdBy: creatorName,
        permission: permissionLabel,
        status: u.isActive ? "Active" : "Inactive",
        assignedClientsCount: parsedPerms.assignAllClients ? "All Clients" : (parsedPerms.assignedClientIds?.length || 0),
        assignAllClients: parsedPerms.assignAllClients ?? true,
        assignedClientIds: parsedPerms.assignedClientIds || [],
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Failed to fetch 365 staff users:", error);
    res.status(500).json({ message: "Failed to fetch staff users" });
  }
});

// POST /api/portal/staff-users - Create practice user in 365
router.post("/staff-users", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId || 1;
    const { firstName, lastName, email, phone, password, permission, assignAllClients, assignedClientIds } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ message: "First name and email are required" });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return res.status(400).json({ message: "A user with this email address already exists" });
    }

    const passwordHash = await bcrypt.hash(password || "SanSuite@2026", 10);
    const role = permission === "Administrator" ? "admin" : permission === "Manager" ? "accountant" : "staff";
    const permsJson = JSON.stringify({
      portalPermission: permission || "Regular User",
      assignAllClients: assignAllClients ?? true,
      assignedClientIds: assignedClientIds || [],
    });

    const [created] = await db.insert(users).values({
      practiceId,
      email,
      passwordHash,
      firstName,
      lastName: lastName || "",
      phone: phone || "",
      role,
      permissionsJson: permsJson,
      isActive: true,
    });

    res.json({ id: created.insertId, message: "User added successfully to 365 portal" });
  } catch (error) {
    console.error("Failed to create 365 staff user:", error);
    res.status(500).json({ message: "Failed to create staff user" });
  }
});

// PUT /api/portal/staff-users/:id - Update practice user in 365
router.put("/staff-users/:id", async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { firstName, lastName, email, phone, permission, assignAllClients, assignedClientIds } = req.body;

    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    let existingPerms: any = {};
    try {
      if (existing.permissionsJson) existingPerms = JSON.parse(existing.permissionsJson);
    } catch (e) {}

    const updatedPerms = JSON.stringify({
      ...existingPerms,
      portalPermission: permission || existingPerms.portalPermission || "Regular User",
      assignAllClients: assignAllClients !== undefined ? assignAllClients : existingPerms.assignAllClients,
      assignedClientIds: assignedClientIds || existingPerms.assignedClientIds || [],
    });

    const role = permission === "Administrator" ? "admin" : permission === "Manager" ? "accountant" : existing.role;

    await db.update(users)
      .set({
        firstName: firstName !== undefined ? firstName : existing.firstName,
        lastName: lastName !== undefined ? lastName : existing.lastName,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        role,
        permissionsJson: updatedPerms,
      })
      .where(eq(users.id, userId));

    const [updated] = await db.select().from(users).where(eq(users.id, userId));

    res.json({
      message: "Staff user updated successfully",
      user: updated ? {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        practiceId: updated.practiceId,
      } : null,
    });
  } catch (error) {
    console.error("Failed to update staff user:", error);
    res.status(500).json({ message: "Failed to update staff user" });
  }
});

// DELETE /api/portal/staff-users/:id
router.delete("/staff-users/:id", async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error("Failed to delete staff user:", error);
    res.status(500).json({ message: "Failed to delete staff user" });
  }
});

// GET /api/portal/permissions-matrix
router.get("/permissions-matrix", async (req: any, res) => {
  try {
    await ensurePortalMatrixTable();
    const practiceId = req.user?.practiceId || 1;
    const [rows]: any = await db.execute(
      sql`SELECT matrix_json FROM portal_permissions_matrix WHERE practice_id = ${practiceId}`
    );
    if (rows && rows.length > 0 && rows[0].matrix_json) {
      const parsed = typeof rows[0].matrix_json === "string" ? JSON.parse(rows[0].matrix_json) : rows[0].matrix_json;
      return res.json(parsed);
    }
    res.json(portalPermissionsMatrix);
  } catch (error) {
    console.error("Error fetching permissions matrix:", error);
    res.json(portalPermissionsMatrix);
  }
});

// PUT /api/portal/permissions-matrix
router.put("/permissions-matrix", async (req: any, res) => {
  try {
    await ensurePortalMatrixTable();
    const practiceId = req.user?.practiceId || 1;
    const matrixData = req.body;
    if (matrixData && typeof matrixData === "object") {
      portalPermissionsMatrix = matrixData;
    }

    const jsonStr = JSON.stringify(portalPermissionsMatrix);
    await db.execute(
      sql`INSERT INTO portal_permissions_matrix (practice_id, matrix_json)
          VALUES (${practiceId}, ${jsonStr})
          ON DUPLICATE KEY UPDATE matrix_json = ${jsonStr}`
    );

    res.json({ message: "Permissions updated successfully", matrix: portalPermissionsMatrix });
  } catch (error) {
    console.error("Failed to update permissions matrix:", error);
    res.status(500).json({ message: "Failed to update permissions" });
  }
});

// POST /api/portal/permissions-matrix/reset
router.post("/permissions-matrix/reset", async (req: any, res) => {
  try {
    await ensurePortalMatrixTable();
    const practiceId = req.user?.practiceId || 1;
    portalPermissionsMatrix = { ...DEFAULT_PERMISSIONS_MATRIX };
    const jsonStr = JSON.stringify(portalPermissionsMatrix);

    await db.execute(
      sql`INSERT INTO portal_permissions_matrix (practice_id, matrix_json)
          VALUES (${practiceId}, ${jsonStr})
          ON DUPLICATE KEY UPDATE matrix_json = ${jsonStr}`
    );

    res.json({ message: "Permissions reset to default", matrix: portalPermissionsMatrix });
  } catch (error) {
    console.error("Failed to reset permissions matrix:", error);
    res.status(500).json({ message: "Failed to reset permissions" });
  }
});

export default router;

