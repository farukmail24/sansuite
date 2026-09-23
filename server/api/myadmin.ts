import { Router } from "express";
import { db } from "../db";
import { users, clients, contacts } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authMiddleware);

// In-memory permissions store for granular user permissions per practice user
const userPermissionsStore: Record<number, any> = {};

// In-memory extra client metadata store (secondary emails, multiple addresses, SIC codes, etc.)
const clientExtraDetailsStore: Record<number, any> = {};

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
    modulePermissions: {
      bookkeeping: isSuper || isAccountant || isStaff || isClient,
      bk_sales: isSuper || isAccountant || isStaff || isClient,
      bk_purchase: isSuper || isAccountant || isStaff || isClient,
      bk_assets: isSuper || isAccountant || isStaff,
      bk_tasks: isSuper || isAccountant || isStaff,
      bk_bank: isSuper || isAccountant || isStaff,
      bk_contacts: isSuper || isAccountant || isStaff,
      bk_schedule: isSuper || isAccountant || isStaff,
      bk_reports: isSuper || isAccountant || isStaff || isClient,
      bk_settings: isSuper || isAccountant,
      bk_quick_entry: isSuper || isAccountant || isStaff,
      bk_vat: isSuper || isAccountant || isStaff,
      bk_cis: isSuper || isAccountant || isStaff,
      bk_inventory: isSuper || isAccountant || isStaff,
      payroll: isSuper || isAccountant || isStaff || isClient,
      mtd_vat: isSuper || isAccountant || isStaff,
      accounts_production: isSuper || isAccountant || isStaff,
      corporation_tax: isSuper || isAccountant || isStaff,
      self_assessment: isSuper || isAccountant || isStaff,
      practice_management: isSuper || isAccountant || isStaff,
      company_secretarial: isSuper || isAccountant || isStaff,
      time_fees: isSuper || isAccountant || isStaff,
      charity_accounts: isSuper || isAccountant,
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
      } else if (clientExtraDetailsStore[c.id]) {
        extraData = clientExtraDetailsStore[c.id];
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
    clientExtraDetailsStore[newClientId] = extra;

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
      } else if (clientExtraDetailsStore[clientId]) {
        existingExtra = clientExtraDetailsStore[clientId];
      }
      const mergedExtra = { ...existingExtra, ...extra };
      updates.extraDetailsJson = JSON.stringify(mergedExtra);
      if (mergedExtra.vatScheme !== undefined) updates.vatScheme = mergedExtra.vatScheme || null;
      clientExtraDetailsStore[clientId] = mergedExtra;
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

    delete clientExtraDetailsStore[clientId];

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

      const [result] = await db.insert(clients).values({
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
      });

      clientExtraDetailsStore[result.insertId] = {
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

// In-memory extra contact metadata store (prefix, sharePercent, jobTitle, altEmail, etc.)
const contactExtraDetailsStore: Record<number, any> = {};

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
        vatNumber: contacts.vatNumber,
        createdAt: contacts.createdAt,
        clientName: clients.clientName,
        clientCode: clients.clientCode,
      })
      .from(contacts)
      .leftJoin(clients, eq(contacts.clientId, clients.id))
      .where(eq(contacts.practiceId, practiceId))
      .orderBy(desc(contacts.createdAt));

    const enriched = allContacts.map((c) => ({
      ...c,
      extra: contactExtraDetailsStore[c.id] || {
        prefix: "Mr",
        firstName: c.name.split(" ")[0] || c.name,
        lastName: c.name.split(" ").slice(1).join(" ") || "",
        jobTitle: "",
        city: "",
        postcode: "",
        country: "United Kingdom",
        sharePercent: "",
        shareClass: "Ordinary",
        niNumber: "",
        dob: "",
      },
    }));

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

    const [result] = await db.insert(contacts).values({
      practiceId,
      clientId: clientId ? parseInt(clientId) : null,
      contactType,
      name: fullName,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      vatNumber: vatNumber?.trim() || null,
    });

    const newContactId = result.insertId;
    contactExtraDetailsStore[newContactId] = {
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
    };

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
    if (clientId !== undefined) updates.clientId = clientId ? parseInt(clientId) : null;
    if (vatNumber !== undefined) updates.vatNumber = vatNumber;

    if (Object.keys(updates).length > 0) {
      await db
        .update(contacts)
        .set(updates)
        .where(and(eq(contacts.id, contactId), eq(contacts.practiceId, practiceId)));
    }

    if (extra || prefix || firstName || lastName) {
      contactExtraDetailsStore[contactId] = {
        ...(contactExtraDetailsStore[contactId] || {}),
        ...(prefix ? { prefix } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(extra || {}),
      };
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

    delete contactExtraDetailsStore[contactId];

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

      const [result] = await db.insert(contacts).values({
        practiceId,
        clientId: matchedClientId,
        contactType: item.type || item.contactType || "Director",
        name: rawName,
        email: item.email || null,
        phone: item.phone || item.phoneNo || null,
        address: item.address || null,
      });

      contactExtraDetailsStore[result.insertId] = {
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

    let allUsers = await db
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

    // If no users exist, seed default practice team members
    if (allUsers.length === 0) {
      const defaultHash = await bcrypt.hash("SanSuite@2026", 10);
      const seedUsers = [
        {
          practiceId,
          email: "james.sterling@demoaccounting.co.uk",
          passwordHash: defaultHash,
          firstName: "James",
          lastName: "Sterling",
          phone: "020 7946 0123",
          role: "admin",
          isActive: true,
        },
        {
          practiceId,
          email: "sarah.jenkins@demoaccounting.co.uk",
          passwordHash: defaultHash,
          firstName: "Sarah",
          lastName: "Jenkins",
          phone: "020 7946 0456",
          role: "accountant",
          isActive: true,
        },
        {
          practiceId,
          email: "david.miller@demoaccounting.co.uk",
          passwordHash: defaultHash,
          firstName: "David",
          lastName: "Miller",
          phone: "020 7946 0789",
          role: "staff",
          isActive: true,
        },
        {
          practiceId,
          email: "emma.watson@demoaccounting.co.uk",
          passwordHash: defaultHash,
          firstName: "Emma",
          lastName: "Watson",
          phone: "020 7946 0999",
          role: "staff",
          isActive: true,
        },
      ];

      for (const u of seedUsers) {
        const defaultPerms = getDefaultPermissions(u.role);
        const [inserted] = await db.insert(users).values({
          ...u,
          permissionsJson: JSON.stringify(defaultPerms),
        });
        userPermissionsStore[inserted.insertId] = defaultPerms;
      }

      allUsers = await db
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
    }

    const enrichedUsers = allUsers.map((u: any) => {
      let perms = getDefaultPermissions(u.role);
      if (u.permissionsJson) {
        try { perms = JSON.parse(u.permissionsJson); } catch (e) {}
      } else if (userPermissionsStore[u.id]) {
        perms = userPermissionsStore[u.id];
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
    userPermissionsStore[newUserId] = finalPerms;

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
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      let existingPerms = getDefaultPermissions(role || u?.role || "staff");
      if (u?.permissionsJson) {
        try { existingPerms = JSON.parse(u.permissionsJson); } catch (e) {}
      } else if (userPermissionsStore[userId]) {
        existingPerms = userPermissionsStore[userId];
      }
      const mergedPerms = { ...existingPerms, ...permissions };
      updates.permissionsJson = JSON.stringify(mergedPerms);
      userPermissionsStore[userId] = mergedPerms;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }

    res.json({ message: "User updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

// DELETE /api/myadmin/users/:id
router.delete("/users/:id", async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    await db.delete(users).where(eq(users.id, userId));
    delete userPermissionsStore[userId];
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// POST /api/myadmin/users/import-csv - Bulk import users
router.post("/users/import-csv", async (req: any, res) => {
  try {
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
        const [result] = await db.insert(users).values({
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

        userPermissionsStore[result.insertId] = getDefaultPermissions(item.role || "staff");
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

export default router;
