import { Router } from "express";
import { db } from "../db";
import { users, clients, contacts, practiceRoles } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { authMiddleware, requirePracticeUser } from "../lib/authUtils";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authMiddleware, requirePracticeUser);

const MODULE_KEYS = [
  "practice_management",
  "bookkeeping",
  "payroll",
  "accounts_production",
  "corporation_tax",
  "self_assessment",
  "time_fees",
  "company_secretarial",
  "mtd_vat",
  "charity_accounts",
  "esign",
  "portal_365",
  "aml",
  "onboarding",
  "mtd_it",
];

const getDefaultCrudPermissions = (role: string) => {
  const isSuper = role === "admin" || role === "super_accountant";
  const isSenior = role === "accountant";
  const isJunior = role === "staff";
  const isAuditor = role === "auditor";

  const crudMap: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean }> = {};

  MODULE_KEYS.forEach((k) => {
    if (isSuper) {
      crudMap[k] = { view: true, create: true, edit: true, delete: true, approve: true };
    } else if (isSenior) {
      crudMap[k] = { view: true, create: true, edit: true, delete: k !== "practice_management", approve: true };
    } else if (isJunior) {
      // Junior staff: View, Create, and Edit own work, but NO Delete and NO Approve
      crudMap[k] = { view: true, create: true, edit: true, delete: false, approve: false };
    } else if (isAuditor) {
      // Auditor: Read-only audit trail
      crudMap[k] = { view: true, create: false, edit: false, delete: false, approve: false };
    } else {
      // Client or restricted portal user
      crudMap[k] = {
        view: k === "portal_365" || k === "bookkeeping" || k === "payroll" || k === "esign",
        create: k === "portal_365" || k === "bookkeeping" || k === "esign",
        edit: k === "portal_365" || k === "bookkeeping",
        delete: false,
        approve: false,
      };
    }
  });

  return crudMap;
};

// Default initial permissions template
const getDefaultPermissions = (role: string) => {
  const isSuper = role === "admin" || role === "super_accountant";
  const isAccountant = role === "accountant";
  const isStaff = role === "staff";
  const isClient = role === "client";

  return {
    autoAssign: isSuper || isAccountant,
    hubAccess: true,
    bankFeedsAccess: isSuper || isAccountant,
    amlOfficer: isSuper,
    assignedClientIds: [],
    clientManagerClientIds: [],
    crudPermissions: getDefaultCrudPermissions(role),
    modulePermissions: {
      portal_365: isSuper || isAccountant || isStaff || isClient,
      bookkeeping: isSuper || isAccountant || isStaff || isClient,
      bk_sales: isSuper || isAccountant || isStaff || isClient,
      bk_purchase: isSuper || isAccountant || isStaff || isClient,
      bk_assets: isSuper || isAccountant || isStaff,
      bk_tasks: isSuper || isAccountant || isStaff,
      bk_bank: isSuper || isAccountant || isStaff || isClient,
      bk_contacts: isSuper || isAccountant || isStaff || isClient,
      bk_schedule: isSuper || isAccountant || isStaff,
      bk_reports: isSuper || isAccountant || isStaff || isClient,
      bk_settings: isSuper || isAccountant,
      bk_quick_entry: isSuper || isAccountant || isStaff,
      bk_vat: isSuper || isAccountant || isStaff,
      bk_cis: isSuper || isAccountant || isStaff,
      bk_inventory: isSuper || isAccountant || isStaff,
      payroll: isSuper || isAccountant || isStaff || isClient,
      esign: isSuper || isAccountant || isStaff || isClient,
      mtd_vat: isSuper || isAccountant || isStaff,
      accounts_production: isSuper || isAccountant || isStaff,
      corporation_tax: isSuper || isAccountant || isStaff,
      self_assessment: isSuper || isAccountant || isStaff,
      practice_management: isSuper || isAccountant || isStaff,
      company_secretarial: isSuper || isAccountant || isStaff,
      time_fees: isSuper || isAccountant || isStaff,
      charity_accounts: isSuper || isAccountant,
      aml: isSuper || isAccountant || isStaff,
      onboarding: isSuper || isAccountant || isStaff,
      mtd_it: isSuper || isAccountant || isStaff,
    },
  };
};

// Statutory due dates calculator (UK HMRC & Companies House compliance)
function computeStatutoryDueDates(yearEndRaw?: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");

  // Confirmation statement (CS01): due 1 year from now + 14 days review window
  const csTarget = new Date(now);
  csTarget.setFullYear(currentYear + 1);
  csTarget.setDate(csTarget.getDate() + 14);
  const nextCsDue = `${pad(csTarget.getDate())}-${pad(csTarget.getMonth() + 1)}-${csTarget.getFullYear()}`;

  // Annual Accounts: Accounting Period End + 9 months
  let apMonth = 11; // Default Dec
  let apDay = 31;
  if (yearEndRaw && yearEndRaw.includes("-")) {
    const parts = yearEndRaw.split("-");
    const parsedDay = parseInt(parts[0], 10);
    const parsedMonth = parseInt(parts[1], 10) - 1;
    if (!isNaN(parsedDay) && !isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
      apDay = parsedDay;
      apMonth = parsedMonth;
    }
  }

  const apDate = new Date(currentYear, apMonth, apDay);
  const accountsDue = new Date(apDate);
  accountsDue.setMonth(accountsDue.getMonth() + 9);
  const nextAccountsDue = `${pad(accountsDue.getDate())}-${pad(accountsDue.getMonth() + 1)}-${accountsDue.getFullYear()}`;

  return { nextCsDue, nextAccountsDue };
}

// =============================================
// CLIENT MANAGEMENT ROUTES (My Admin > Clients)
// =============================================

// GET /api/myadmin/clients - Fetch full practice clients directory
router.get("/clients", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientList = await db
      .select()
      .from(clients)
      .where(eq(clients.practiceId, practiceId))
      .orderBy(desc(clients.createdAt));

    const enriched = clientList.map((c: any) => {
      let extraData: any = {};
      if (c.extraDetailsJson) {
        try { extraData = JSON.parse(c.extraDetailsJson); } catch (e) {}
      }
      return {
        ...c,
        extra: {
          secondaryEmail: "",
          tradingAddress: "",
          overseasAddress: "",
          sicCodes: "",
          vatScheme: c.vatScheme || "Standard",
          vatSubmitType: "Quarterly (MTD)",
          accountsOfficeRef: "",
          payeRef: "",
          businessStartDate: "",
          bookStartDate: "",
          yearEnd: "",
          keyContact: "",
          clientManager: "",
          ...extraData,
        },
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch practice clients" });
  }
});

// POST /api/myadmin/clients - Create new client
router.post("/clients", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const {
      clientCode,
      clientName,
      clientType,
      registrationNumber,
      utrNumber,
      niNumber,
      vatNumber,
      email,
      phone,
      address,
      postcode,
      country,
      tradingStatus,
      isActive,
      extra = {},
    } = req.body;

    if (!clientName || !clientType) {
      return res.status(400).json({ message: "Client name and type are required." });
    }

    const finalCode = clientCode || `CL-${Date.now().toString().slice(-4)}`;

    const { nextCsDue, nextAccountsDue } = computeStatutoryDueDates(extra?.yearEnd);

    const [result] = await db.insert(clients).values({
      practiceId,
      clientCode: finalCode,
      clientName: clientName.trim(),
      clientType,
      registrationNumber: registrationNumber?.trim() || null,
      utrNumber: utrNumber?.trim() || null,
      niNumber: niNumber?.trim() || null,
      vatNumber: vatNumber?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      postcode: postcode?.trim() || null,
      country: country || "United Kingdom",
      tradingStatus: tradingStatus || "Trading",
      isActive: isActive !== false,
      nextCsDue,
      nextAccountsDue,
      vatScheme: extra?.vatScheme || null,
      extraDetailsJson: extra ? JSON.stringify(extra) : null,
    });

    const newClientId = result.insertId;

    res.json({
      id: newClientId,
      clientCode: finalCode,
      message: "Client created successfully in practice registry.",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create client", error: error.message });
  }
});

// PATCH /api/myadmin/clients/:id - Update client information & status
router.patch("/clients/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientId = parseInt(req.params.id);
    const {
      clientCode,
      clientName,
      clientType,
      registrationNumber,
      utrNumber,
      niNumber,
      vatNumber,
      email,
      phone,
      address,
      postcode,
      country,
      tradingStatus,
      isActive,
      nextCsDue,
      nextAccountsDue,
      extra,
    } = req.body;

    const updates: any = {};
    if (clientCode !== undefined) updates.clientCode = clientCode;
    if (clientName !== undefined) updates.clientName = clientName;
    if (clientType !== undefined) updates.clientType = clientType;
    if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber;
    if (utrNumber !== undefined) updates.utrNumber = utrNumber;
    if (niNumber !== undefined) updates.niNumber = niNumber;
    if (vatNumber !== undefined) updates.vatNumber = vatNumber;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (postcode !== undefined) updates.postcode = postcode;
    if (country !== undefined) updates.country = country;
    if (tradingStatus !== undefined) updates.tradingStatus = tradingStatus;
    if (isActive !== undefined) updates.isActive = isActive;
    if (nextCsDue !== undefined) updates.nextCsDue = nextCsDue;
    if (nextAccountsDue !== undefined) updates.nextAccountsDue = nextAccountsDue;

    if (extra) {
      const [existingClient] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.practiceId, practiceId))).limit(1);
      let existingExtra = {};
      if (existingClient?.extraDetailsJson) {
        try { existingExtra = JSON.parse(existingClient.extraDetailsJson); } catch (e) {}
      }
      const mergedExtra = { ...existingExtra, ...extra };
      updates.extraDetailsJson = JSON.stringify(mergedExtra);
      if (mergedExtra.vatScheme !== undefined) updates.vatScheme = mergedExtra.vatScheme || null;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(clients)
        .set(updates)
        .where(and(eq(clients.id, clientId), eq(clients.practiceId, practiceId)));
    }

    res.json({ message: "Client updated successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update client", error: error.message });
  }
});

// DELETE /api/myadmin/clients/:id - Remove client
router.delete("/clients/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const clientId = parseInt(req.params.id);

    await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.practiceId, practiceId)));

    res.json({ message: "Client removed from practice registry." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete client", error: error.message });
  }
});

// POST /api/myadmin/clients/bulk-status - Bulk toggle active/inactive status (Article 9000271605)
router.post("/clients/bulk-status", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientIds, isActive } = req.body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: "No client IDs provided." });
    }

    await db
      .update(clients)
      .set({ isActive: !!isActive })
      .where(and(inArray(clients.id, clientIds), eq(clients.practiceId, practiceId)));

    res.json({
      message: `Updated status to ${isActive ? "Active" : "Inactive"} for ${clientIds.length} clients.`,
      updatedCount: clientIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update bulk status", error: error.message });
  }
});

// POST /api/myadmin/clients/import-csv - Bulk CSV import clients (Article 9000267571 & 9000231556)
router.post("/clients/import-csv", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientsList } = req.body;

    if (!Array.isArray(clientsList) || clientsList.length === 0) {
      return res.status(400).json({ message: "No valid clients provided in CSV payload." });
    }

    let createdCount = 0;
    const existing = await db.select().from(clients).where(eq(clients.practiceId, practiceId));
    let nextIdCounter = existing.length + 1;

    for (const item of clientsList) {
      if (!item.clientName && !item.name) continue;
      const cName = (item.clientName || item.name).trim();
      const cCode = (item.clientCode || item.clientId || `CL${String(nextIdCounter).padStart(3, "0")}`).trim();
      const { nextCsDue, nextAccountsDue } = computeStatutoryDueDates(item.yearEnd);

      const extraMeta = {
        secondaryEmail: item.secondaryEmail || "",
        tradingAddress: item.tradingAddress || "",
        overseasAddress: item.overseasAddress || "",
        sicCodes: item.sicCodes || item.sic || "",
        vatScheme: item.vatScheme || "Standard",
        vatSubmitType: item.vatSubmitType || "Quarterly (MTD)",
        accountsOfficeRef: item.accountsOfficeRef || "",
        payeRef: item.payeRef || "",
        businessStartDate: item.businessStartDate || "",
        bookStartDate: item.bookStartDate || "",
        yearEnd: item.yearEnd || "",
      };

      await db.insert(clients).values({
        practiceId,
        clientCode: cCode,
        clientName: cName,
        clientType: item.clientType || item.type || "Limited",
        registrationNumber: item.registrationNumber || item.registrationNo || item.crn || null,
        utrNumber: item.utrNumber || item.utr || null,
        vatNumber: item.vatNumber || item.vatNo || null,
        email: item.email || item.primaryEmail || null,
        phone: item.phone || null,
        address: item.address || null,
        postcode: item.postcode || item.postCode || null,
        country: item.country || "United Kingdom",
        tradingStatus: item.tradingStatus || "Trading",
        isActive: true,
        nextCsDue,
        nextAccountsDue,
        vatScheme: extraMeta.vatScheme || null,
        extraDetailsJson: JSON.stringify(extraMeta),
      });

      nextIdCounter++;
      createdCount++;
    }

    res.json({
      message: `Successfully imported ${createdCount} clients into practice registry.`,
      importedCount: createdCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to import clients from CSV", error: error.message });
  }
});

// =============================================
// CONTACTS MANAGEMENT ROUTES (My Admin > Contacts)
// =============================================

// GET /api/myadmin/contacts - Fetch full practice contacts directory
router.get("/contacts", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;

    const allContacts = await db
      .select({
        id: contacts.id,
        practiceId: contacts.practiceId,
        clientId: contacts.clientId,
        contactType: contacts.contactType,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        address: contacts.address,
        city: contacts.city,
        postcode: contacts.postcode,
        country: contacts.country,
        designation: contacts.designation,
        notes: contacts.notes,
        vatNumber: contacts.vatNumber,
        createdAt: contacts.createdAt,
        clientName: clients.clientName,
        clientCode: clients.clientCode,
      })
      .from(contacts)
      .leftJoin(clients, eq(contacts.clientId, clients.id))
      .where(eq(contacts.practiceId, practiceId))
      .orderBy(desc(contacts.createdAt));

    const enriched = allContacts.map((c) => {
      let extraData: any = {};
      if (c.notes) {
        try { extraData = JSON.parse(c.notes); } catch (e) {}
      }
      return {
        ...c,
        extra: {
          prefix: extraData.prefix || "Mr",
          firstName: extraData.firstName || c.name.split(" ")[0] || c.name,
          middleName: extraData.middleName || "",
          lastName: extraData.lastName || c.name.split(" ").slice(1).join(" ") || "",
          jobTitle: extraData.jobTitle || c.designation || "",
          city: c.city || extraData.city || "",
          postcode: c.postcode || extraData.postcode || "",
          country: c.country || extraData.country || "United Kingdom",
          sharePercent: extraData.sharePercent || "",
          shareClass: extraData.shareClass || "Ordinary",
          niNumber: extraData.niNumber || "",
          dob: extraData.dob || "",
          ...extraData,
        },
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch practice contacts" });
  }
});

// POST /api/myadmin/contacts - Create new contact
router.post("/contacts", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const {
      prefix = "Mr",
      firstName,
      middleName,
      lastName,
      name,
      contactType = "Director",
      email,
      phone,
      address,
      postcode,
      city,
      country = "United Kingdom",
      clientId,
      vatNumber,
      extra = {},
    } = req.body;

    const fullName = name?.trim() || `${prefix ? `${prefix} ` : ""}${firstName || ""} ${middleName ? `${middleName} ` : ""}${lastName || ""}`.trim();

    if (!fullName) {
      return res.status(400).json({ message: "Contact name is required." });
    }

    const contactMeta = {
      prefix: prefix || "Mr",
      firstName: firstName || fullName.split(" ")[0] || fullName,
      middleName: middleName || "",
      lastName: lastName || fullName.split(" ").slice(1).join(" ") || "",
      jobTitle: extra.jobTitle || "",
      city: city || "",
      postcode: postcode || "",
      country: country || "United Kingdom",
      sharePercent: extra.sharePercent || "",
      shareClass: extra.shareClass || "Ordinary",
      niNumber: extra.niNumber || "",
      dob: extra.dob || "",
      ...extra,
    };

    const [result] = await db.insert(contacts).values({
      practiceId,
      clientId: clientId ? parseInt(clientId) : null,
      contactType,
      name: fullName,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      postcode: postcode?.trim() || null,
      country: country || "United Kingdom",
      designation: extra.jobTitle?.trim() || null,
      notes: JSON.stringify(contactMeta),
      vatNumber: vatNumber?.trim() || null,
    });

    const newContactId = result.insertId;

    res.json({
      id: newContactId,
      message: "Contact saved to practice directory successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create contact", error: error.message });
  }
});

// PATCH /api/myadmin/contacts/:id - Update contact
router.patch("/contacts/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const contactId = parseInt(req.params.id);
    const {
      name,
      prefix,
      firstName,
      lastName,
      contactType,
      email,
      phone,
      address,
      city,
      postcode,
      country,
      clientId,
      vatNumber,
      extra,
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (contactType !== undefined) updates.contactType = contactType;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (postcode !== undefined) updates.postcode = postcode;
    if (country !== undefined) updates.country = country;
    if (clientId !== undefined) updates.clientId = clientId ? parseInt(clientId) : null;
    if (vatNumber !== undefined) updates.vatNumber = vatNumber;

    if (extra || prefix || firstName || lastName || city || postcode || country) {
      const [existingContact] = await db.select().from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.practiceId, practiceId))).limit(1);
      let existingExtra: any = {};
      if (existingContact?.notes) {
        try { existingExtra = JSON.parse(existingContact.notes); } catch (e) {}
      }
      const mergedExtra = {
        ...existingExtra,
        ...(prefix ? { prefix } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(city ? { city } : {}),
        ...(postcode ? { postcode } : {}),
        ...(country ? { country } : {}),
        ...(extra || {}),
      };
      updates.notes = JSON.stringify(mergedExtra);
      if (mergedExtra.jobTitle) updates.designation = mergedExtra.jobTitle;
      if (mergedExtra.city) updates.city = mergedExtra.city;
      if (mergedExtra.postcode) updates.postcode = mergedExtra.postcode;
      if (mergedExtra.country) updates.country = mergedExtra.country;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(contacts)
        .set(updates)
        .where(and(eq(contacts.id, contactId), eq(contacts.practiceId, practiceId)));
    }

    res.json({ message: "Contact updated successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update contact", error: error.message });
  }
});

// DELETE /api/myadmin/contacts/:id - Delete contact
router.delete("/contacts/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const contactId = parseInt(req.params.id);

    await db
      .delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.practiceId, practiceId)));

    res.json({ message: "Contact deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete contact", error: error.message });
  }
});

// POST /api/myadmin/contacts/import-csv - Bulk CSV import contacts (Article 9000231556)
router.post("/contacts/import-csv", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { contactsList } = req.body;

    if (!Array.isArray(contactsList) || contactsList.length === 0) {
      return res.status(400).json({ message: "No valid contacts provided in CSV payload." });
    }

    let createdCount = 0;
    const allClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));

    for (const item of contactsList) {
      const fName = (item.firstName || "").trim();
      const lName = (item.lastName || "").trim();
      const prefix = (item.prefix || "Mr").trim();
      const rawName = (item.name || `${prefix} ${fName} ${lName}`).trim();
      if (!rawName) continue;

      // Find matching client if linked client code or name provided
      let matchedClientId: number | null = null;
      if (item.linkedClientCode || item.clientCode || item.clientName) {
        const query = (item.linkedClientCode || item.clientCode || item.clientName).toLowerCase();
        const found = allClients.find(
          (c) => c.clientCode?.toLowerCase() === query || c.clientName?.toLowerCase().includes(query)
        );
        if (found) matchedClientId = found.id;
      }

      const meta = {
        prefix,
        firstName: fName || rawName.split(" ")[0] || rawName,
        lastName: lName || rawName.split(" ").slice(1).join(" ") || "",
        jobTitle: item.jobTitle || "",
        city: item.city || item.cityTown || "",
        postcode: item.postcode || item.postCode || "",
        country: item.country || "United Kingdom",
        sharePercent: item.sharePercent || item.equity || "",
        shareClass: item.shareClass || "Ordinary",
        niNumber: item.niNumber || "",
        dob: item.dob || "",
      };

      await db.insert(contacts).values({
        practiceId,
        clientId: matchedClientId,
        contactType: item.type || item.contactType || "Director",
        name: rawName,
        email: item.email || null,
        phone: item.phone || item.phoneNo || null,
        address: item.address || null,
        city: meta.city || null,
        postcode: meta.postcode || null,
        country: meta.country || "United Kingdom",
        designation: meta.jobTitle || null,
        notes: JSON.stringify(meta),
      });

      createdCount++;
    }

    res.json({
      message: `Successfully imported ${createdCount} contacts into practice registry.`,
      importedCount: createdCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to import contacts from CSV", error: error.message });
  }
});

// =============================================
// USERS & ROLES ROUTES (My Admin > Users)
// =============================================

// GET /api/myadmin/users - Get all users in practice with permissions
router.get("/users", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;

    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        permissionsJson: users.permissionsJson,
      })
      .from(users)
      .where(eq(users.practiceId, practiceId))
      .orderBy(desc(users.createdAt));

    const enrichedUsers = allUsers.map((u: any) => {
      let perms = getDefaultPermissions(u.role);
      if (u.permissionsJson) {
        try { perms = JSON.parse(u.permissionsJson); } catch (e) {}
      }
      return {
        ...u,
        permissions: perms,
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch practice users" });
  }
});

// POST /api/myadmin/users - Create new user with permissions
router.post("/users", async (req: any, res) => {
  try {
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can create or modify users and permissions." });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      role = "staff",
      password,
      permissions,
    } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({ message: "First name and email are required." });
    }

    // Check if email exists
    const existing = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered in system." });
    }

    const passwordHash = await bcrypt.hash(password || "SanSuite@2026", 10);
    const finalPerms = permissions || getDefaultPermissions(role);

    const [result] = await db.insert(users).values({
      practiceId: req.user.practiceId,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: (lastName || "").trim(),
      phone: phone || "",
      role: role || "staff",
      isActive: true,
      permissionsJson: JSON.stringify(finalPerms),
    });

    const newUserId = result.insertId;

    res.json({
      id: newUserId,
      message: "User created and permissions allocated successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
});

// PATCH /api/myadmin/users/:id - Update user details & permissions
router.patch("/users/:id", async (req: any, res) => {
  try {
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can modify users and permissions." });
    }

    const practiceId = req.user.practiceId;
    const userId = parseInt(req.params.id);
    const {
      firstName,
      lastName,
      phone,
      role,
      isActive,
      password,
      permissions,
    } = req.body;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.practiceId, practiceId)))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found in practice directory." });
    }

    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    if (permissions) {
      let existingPerms = getDefaultPermissions(role || existingUser.role || "staff");
      if (existingUser.permissionsJson) {
        try { existingPerms = JSON.parse(existingUser.permissionsJson); } catch (e) {}
      }
      const mergedPerms = { ...existingPerms, ...permissions };
      updates.permissionsJson = JSON.stringify(mergedPerms);
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(users)
        .set(updates)
        .where(and(eq(users.id, userId), eq(users.practiceId, practiceId)));
    }

    res.json({ message: "User updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

// DELETE /api/myadmin/users/:id
router.delete("/users/:id", async (req: any, res) => {
  try {
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can delete users." });
    }

    const practiceId = req.user.practiceId;
    const userId = parseInt(req.params.id);

    await db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.practiceId, practiceId)));

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// POST /api/myadmin/users/import-csv - Bulk import users
router.post("/users/import-csv", async (req: any, res) => {
  try {
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can import users." });
    }

    const { usersList } = req.body;
    if (!Array.isArray(usersList) || usersList.length === 0) {
      return res.status(400).json({ message: "No valid users provided in import list." });
    }

    let createdCount = 0;
    const defaultPass = await bcrypt.hash("SanSuite@2026", 10);

    for (const item of usersList) {
      if (!item.email || !item.firstName) continue;
      const cleanEmail = item.email.trim().toLowerCase();

      const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (existing.length === 0) {
        await db.insert(users).values({
          practiceId: req.user.practiceId,
          email: cleanEmail,
          passwordHash: defaultPass,
          firstName: item.firstName.trim(),
          lastName: (item.lastName || "").trim(),
          phone: item.phone || item.phoneNo || "",
          role: (item.role || item.userType || "staff").toLowerCase().replace(" ", "_"),
          isActive: true,
          permissionsJson: JSON.stringify(getDefaultPermissions(item.role || "staff")),
        });

        createdCount++;
      }
    }

    res.json({
      message: `Successfully imported ${createdCount} new users.`,
      importedCount: createdCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: "CSV import failed", error: error.message });
  }
});

// =============================================
// MULTI-TENANT PRACTICE CUSTOM ROLES
// =============================================

// GET /api/myadmin/roles - Fetch custom practice roles for tenant
router.get("/roles", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const customRoles = await db
      .select()
      .from(practiceRoles)
      .where(eq(practiceRoles.practiceId, practiceId))
      .orderBy(desc(practiceRoles.createdAt));

    res.json(customRoles);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch practice roles", error: error.message });
  }
});

// POST /api/myadmin/roles - Create custom practice role template
router.post("/roles", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can create custom roles." });
    }

    const { roleName, description, baseTier = "staff", badge, permissionsJson } = req.body;

    if (!roleName || !roleName.trim()) {
      return res.status(400).json({ message: "Role name is required." });
    }

    const roleCode = "custom_" + roleName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");

    const [result] = await db.insert(practiceRoles).values({
      practiceId,
      roleName: roleName.trim(),
      roleCode,
      badge: badge || "Custom Practice Role",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      description: description || `Custom practice role: ${roleName.trim()}`,
      baseTier: baseTier || "staff",
      permissionsJson: typeof permissionsJson === "string" ? permissionsJson : JSON.stringify(permissionsJson || {}),
    });

    res.json({
      id: result.insertId,
      roleCode,
      roleName: roleName.trim(),
      message: "Custom practice role created successfully.",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create custom practice role", error: error.message });
  }
});

// DELETE /api/myadmin/roles/:id - Delete custom practice role
router.delete("/roles/:id", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const requestingRole = req.user?.role || "staff";
    const isSuper = requestingRole === "admin" || requestingRole === "super_accountant";
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Practice Admins can delete custom roles." });
    }

    const roleId = parseInt(req.params.id);

    await db
      .delete(practiceRoles)
      .where(and(eq(practiceRoles.id, roleId), eq(practiceRoles.practiceId, practiceId)));

    res.json({ message: "Custom practice role deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete practice role", error: error.message });
  }
});

export default router;

