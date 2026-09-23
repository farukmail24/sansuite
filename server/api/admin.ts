import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import {
  users, firmDetails, practices, practiceSubscriptions, systemPayments,
  practiceContacts, firmNotes, practiceBackups, practiceReferrals,
  clients, pmClientTimeline, practiceMediaFiles
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, requireRole } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// --- FIRM DETAILS ---
router.get("/firm-details", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
    const [practice] = await db.select().from(practices).where(eq(practices.id, practiceId)).limit(1);

    const planRaw = practice?.plan || "basic";
    const subscriptionTier = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);

    const formatDateOnlyIso = (d: any) => {
      if (!d) return null;
      if (d instanceof Date) {
        return d.toISOString().split("T")[0];
      }
      if (typeof d === "string") {
        const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : d;
      }
      return d;
    };

    res.json({
      ...(firm || {}),
      businessStartDate: formatDateOnlyIso(firm?.businessStartDate),
      bookStartDate: formatDateOnlyIso(firm?.bookStartDate),
      vatRegDate: formatDateOnlyIso(firm?.vatRegDate),
      firmName: firm?.firmName || practice?.name,
      subscriptionTier,
    });
  } catch (error) {
    console.error("[ADMIN FIRM DETAILS FETCH ERROR]", error);
    res.status(500).json({ message: "Failed to fetch firm details" });
  }
});

router.post("/firm-details", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const {
      firmType, firmName, email, phone, address, city, postCode, website,
      businessStartDate, bookStartDate, yearEnd, vatScheme, vatRegNumber,
      vatRegDate, vatSubmitType, registrationNo, utrNumber, officeRefNo, country,
      hmrcGatewayId, hmrcGatewayPasswordEncrypted, logoUrl,
      hmrcAgentCode, saAgentId, ctAgentId, notificationSettings, smsBalance
    } = req.body;

    const data: any = {
      practiceId,
      firmType: firmType || null,
      firmName: firmName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      postCode: postCode || null,
      website: website || null,
      yearEnd: yearEnd || null,
      vatScheme: vatScheme || null,
      vatRegNumber: vatRegNumber || null,
      vatSubmitType: vatSubmitType || null,
      registrationNo: registrationNo || null,
      utrNumber: utrNumber || null,
      officeRefNo: officeRefNo || null,
      country: country || "United Kingdom",
      hmrcGatewayId: hmrcGatewayId || null,
      hmrcGatewayPasswordEncrypted: hmrcGatewayPasswordEncrypted || null,
    };

    if (hmrcAgentCode !== undefined) data.hmrcAgentCode = hmrcAgentCode || null;
    if (saAgentId !== undefined) data.saAgentId = saAgentId || null;
    if (ctAgentId !== undefined) data.ctAgentId = ctAgentId || null;
    if (notificationSettings !== undefined) {
      data.notificationSettings = typeof notificationSettings === "string" ? notificationSettings : JSON.stringify(notificationSettings);
    }
    if (smsBalance !== undefined) data.smsBalance = Number(smsBalance);

    if (logoUrl !== undefined && logoUrl !== null && logoUrl !== "") {
      data.logoUrl = logoUrl;
    }

    if (businessStartDate && typeof businessStartDate === 'string' && businessStartDate.trim() !== '') {
      data.businessStartDate = new Date(businessStartDate);
    }
    if (bookStartDate && typeof bookStartDate === 'string' && bookStartDate.trim() !== '') {
      data.bookStartDate = new Date(bookStartDate);
    }
    if (vatRegDate && typeof vatRegDate === 'string' && vatRegDate.trim() !== '') {
      data.vatRegDate = new Date(vatRegDate);
    }

    const [existing] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);

    if (existing) {
      await db.update(firmDetails).set(data).where(eq(firmDetails.id, existing.id));
    } else {
      await db.insert(firmDetails).values(data);
    }

    if (firmName && typeof firmName === 'string' && firmName.trim() !== '') {
      await db.update(practices).set({ name: firmName.trim() }).where(eq(practices.id, practiceId));
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[FIRM DETAILS SAVE ERROR]", error);
    res.status(500).json({ message: error?.message || "Failed to save firm details" });
  }
});

// --- USERS ---
router.get("/users", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLogin: users.lastLogin
    }).from(users).where(eq(users.practiceId, practiceId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", requireRole("admin", "accountant"), async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { firstName, lastName, email, password, role, phone } = req.body;
    if (!firstName || !email || !password) {
      return res.status(400).json({ message: "firstName, email and password are required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.insert(users).values({
      practiceId, firstName, lastName, email, passwordHash, role: role || "staff",
      phone, isActive: true
    });
    res.json({ id: result.insertId, firstName, lastName, email, role });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.patch("/users/:id", requireRole("admin"), async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    // Ensure target user belongs to same practice
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target || target.practiceId !== practiceId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { isActive, role, firstName, lastName, phone } = req.body;
    const update: any = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (role !== undefined) update.role = role;
    if (firstName !== undefined) update.firstName = firstName;
    if (lastName !== undefined) update.lastName = lastName;
    if (phone !== undefined) update.phone = phone;
    await db.update(users).set(update).where(eq(users.id, id));
    res.json({ message: "User updated" });
  } catch {
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/users/:id", requireRole("admin"), async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    // Ensure target user belongs to same practice (prevent cross-practice deletion)
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target || target.practiceId !== practiceId) {
      return res.status(403).json({ message: "Access denied" });
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// --- SUBSCRIPTION (Dynamic Tier Change) ---
router.get("/subscription", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const [practice] = await db.select().from(practices).where(eq(practices.id, practiceId)).limit(1);
    const planName = practice?.plan ? practice.plan.charAt(0).toUpperCase() + practice.plan.slice(1) : "Basic";

    res.json({
      plan: planName,
      status: "Active",
      renewalDate: "2027-01-01",
      modules: ["Practice Management", "Bookkeeping", "Payroll", "Accounts Production", "Corporation Tax", "Self Assessment"]
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
});

router.post("/change-subscription", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { planName } = req.body;
    if (!planName) return res.status(400).json({ message: "planName is required" });

    const cleanPlanName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();

    if (practiceId) {
      await db.update(practices).set({ plan: cleanPlanName.toLowerCase() }).where(eq(practices.id, practiceId));

      const [existingSub] = await db.select().from(practiceSubscriptions).where(eq(practiceSubscriptions.practiceId, practiceId)).limit(1);
      if (existingSub) {
        await db.update(practiceSubscriptions)
          .set({ tierName: cleanPlanName, paymentStatus: 'Active' })
          .where(eq(practiceSubscriptions.id, existingSub.id));
      } else {
        await db.insert(practiceSubscriptions).values({
          practiceId,
          tierName: cleanPlanName,
          paymentStatus: 'Active'
        });
      }
    }

    res.json({ success: true, message: `Successfully updated plan to ${cleanPlanName}`, subscriptionTier: cleanPlanName });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update subscription plan", error: error.message });
  }
});

router.post("/checkout-subscription", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { planName, gatewayId, transactionRef, amount } = req.body;

    if (!planName || !gatewayId) {
      return res.status(400).json({ message: "planName and gatewayId are required" });
    }

    const cleanPlanName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();
    const numericAmount = amount ? String(parseFloat(amount).toFixed(2)) : "99.00";
    const isManual = gatewayId === "manual";

    if (isManual) {
      // Manual Wire Transfer — store pending transaction
      if (practiceId) {
        const [existingSub] = await db.select().from(practiceSubscriptions).where(eq(practiceSubscriptions.practiceId, practiceId)).limit(1);
        if (existingSub) {
          await db.update(practiceSubscriptions)
            .set({ tierName: cleanPlanName, paymentStatus: "Pending Verification" })
            .where(eq(practiceSubscriptions.id, existingSub.id));
        } else {
          await db.insert(practiceSubscriptions).values({ practiceId, tierName: cleanPlanName, paymentStatus: "Pending Verification" });
        }
        await db.insert(systemPayments).values({
          practiceId,
          amount: numericAmount,
          currency: "GBP",
          paymentMethod: "manual",
          status: "pending",
          description: `Subscription Upgrade to ${cleanPlanName} (Wire Ref: ${transactionRef || "N/A"})`,
        });
      }
      console.log(`[PAYMENT CHECKOUT] Practice #${practiceId} requested manual upgrade to ${cleanPlanName} (PENDING, Ref: ${transactionRef || "N/A"})`);
      return res.json({
        success: true,
        isManual: true,
        isPending: true,
        message: `Payment details submitted via International Wire Transfer. Your upgrade to ${cleanPlanName} is pending System Admin verification.`,
        planName: cleanPlanName,
        gatewayId,
      });
    }

    // Online gateways — route to gateway-checkout page
    let redirectUrl: string;

    if (gatewayId === "stripe") {
      // Stripe: server must create PaymentIntent first to get clientSecret
      redirectUrl = `/api/payments/create-stripe-session?plan=${encodeURIComponent(cleanPlanName)}&amount=${encodeURIComponent(numericAmount)}&practiceId=${encodeURIComponent(practiceId)}`;
    } else {
      // All other gateways (PayPal, Razorpay, 2Checkout, Authorize.Net, GoCardless) go to gateway-checkout
      redirectUrl = `/api/payments/gateway-checkout?gateway=${encodeURIComponent(gatewayId)}&plan=${encodeURIComponent(cleanPlanName)}&amount=${encodeURIComponent(numericAmount)}&practiceId=${encodeURIComponent(practiceId)}`;
    }

    console.log(`[PAYMENT REDIRECT] Practice #${practiceId} → ${gatewayId.toUpperCase()} checkout for ${cleanPlanName} (£${numericAmount})`);

    return res.json({
      success: true,
      isManual: false,
      redirectUrl,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Checkout failed", error: error.message });
  }
});


// --- PRACTICE CONTACTS ---
router.get("/contacts", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select().from(practiceContacts).where(eq(practiceContacts.practiceId, practiceId));
    res.json(list);
  } catch (error: any) {
    console.error("[ADMIN CONTACTS FETCH ERROR]", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

router.post("/contacts", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { name, contactType, email, phone, address, country } = req.body;
    if (!name) return res.status(400).json({ message: "Contact name is required" });

    const [result] = await db.insert(practiceContacts).values({
      practiceId,
      name,
      contactType: contactType || "Primary Contact",
      email: email || null,
      phone: phone || null,
      address: address || null,
      country: country || "United Kingdom",
    });

    res.json({ success: true, id: result.insertId, practiceId, name, contactType, email, phone, address, country });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save contact" });
  }
});

router.delete("/contacts/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    await db.delete(practiceContacts).where(and(eq(practiceContacts.id, id), eq(practiceContacts.practiceId, practiceId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete contact" });
  }
});

// --- FIRM NOTES ---
router.get("/notes", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select().from(firmNotes).where(eq(firmNotes.practiceId, practiceId)).orderBy(desc(firmNotes.createdAt));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch firm notes" });
  }
});

router.post("/notes", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { title, text } = req.body;
    if (!title || !text) return res.status(400).json({ message: "Title and text are required" });

    const [result] = await db.insert(firmNotes).values({
      practiceId,
      title,
      text,
      createdBy: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || "Practice Admin",
    });

    res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create note" });
  }
});

router.delete("/notes/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    await db.delete(firmNotes).where(and(eq(firmNotes.id, id), eq(firmNotes.practiceId, practiceId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete note" });
  }
});

// --- PRACTICE BACKUPS ---
router.get("/backups", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select().from(practiceBackups).where(eq(practiceBackups.practiceId, practiceId)).orderBy(desc(practiceBackups.createdAt));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch backups" });
  }
});

router.post("/backups", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const requestedBy = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || "Practice Admin";
    const backupCode = `BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Gather practice data snapshot
    const [practiceClients, practiceUsersList, practiceContactsList] = await Promise.all([
      db.select().from(clients).where(eq(clients.practiceId, practiceId)),
      db.select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, role: users.role, isActive: users.isActive }).from(users).where(eq(users.practiceId, practiceId)),
      db.select().from(practiceContacts).where(eq(practiceContacts.practiceId, practiceId)),
    ]);

    const backupData = {
      practiceId,
      backupCode,
      generatedAt: new Date().toISOString(),
      requestedBy,
      totalClients: practiceClients.length,
      totalUsers: practiceUsersList.length,
      totalContacts: practiceContactsList.length,
      clients: practiceClients,
      users: practiceUsersList,
      contacts: practiceContactsList,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const sizeKb = (Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(1);

    const [result] = await db.insert(practiceBackups).values({
      practiceId,
      backupCode,
      requestedBy,
      fileFormat: "JSON / DB Dump",
      status: "Ready",
      fileSize: `${sizeKb} KB`,
      filePath: jsonString,
    });

    res.json({ success: true, id: result.insertId, backupCode, fileSize: `${sizeKb} KB` });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create practice backup", error: error.message });
  }
});

router.get("/backups/:id/download", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    const [backup] = await db.select().from(practiceBackups).where(and(eq(practiceBackups.id, id), eq(practiceBackups.practiceId, practiceId))).limit(1);
    if (!backup) return res.status(404).json({ message: "Backup not found" });

    res.setHeader("Content-Disposition", `attachment; filename="${backup.backupCode}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(backup.filePath || JSON.stringify(backup));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to download backup" });
  }
});

// --- PRACTICE REFERRALS ---
router.get("/referrals", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select().from(practiceReferrals).where(eq(practiceReferrals.practiceId, practiceId)).orderBy(desc(practiceReferrals.createdAt));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
});

router.post("/referrals", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { colleagueName, colleagueEmail, message } = req.body;
    if (!colleagueName || !colleagueEmail) return res.status(400).json({ message: "Name and email are required" });

    const [result] = await db.insert(practiceReferrals).values({
      practiceId,
      colleagueName,
      colleagueEmail,
      message: message || "Hi, I recommend SanSuite for your accounting practice.",
      status: "Invited",
    });

    res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to send referral" });
  }
});

// --- PRACTICE SMS CONSOLE ---
router.post("/sms/send", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, message } = req.body;

    if (!message) return res.status(400).json({ message: "Message content is required" });

    const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
    const currentBalance = firm?.smsBalance ?? 50;

    if (currentBalance < 1) {
      return res.status(400).json({ message: "Insufficient SMS credits. Please top up your balance." });
    }

    const newBalance = currentBalance - 1;
    if (firm) {
      await db.update(firmDetails).set({ smsBalance: newBalance }).where(eq(firmDetails.id, firm.id));
    }

    if (clientId) {
      await db.insert(pmClientTimeline).values({
        practiceId,
        clientId: Number(clientId),
        userId: req.user?.id || null,
        activityType: "SMS",
        title: "Bulk SMS Sent",
        content: message,
      });
    }

    res.json({ success: true, message: "SMS dispatched successfully", newBalance });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to dispatch SMS", error: error.message });
  }
});

router.post("/sms/topup", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { credits } = req.body;
    const amount = Number(credits) || 100;

    const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
    const currentBalance = firm?.smsBalance ?? 50;
    const newBalance = currentBalance + amount;

    if (firm) {
      await db.update(firmDetails).set({ smsBalance: newBalance }).where(eq(firmDetails.id, firm.id));
    }

    res.json({ success: true, newBalance, added: amount });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to top up SMS credits" });
  }
});

// --- PRACTICE MEDIA & FILE LIBRARY ---
router.get("/media", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const list = await db.select().from(practiceMediaFiles).where(eq(practiceMediaFiles.practiceId, practiceId)).orderBy(desc(practiceMediaFiles.createdAt));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch media files" });
  }
});

router.post("/media", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { name, type, size, url, category, storageDriver, storageLocation } = req.body;
    if (!name || !size) return res.status(400).json({ message: "File name and size are required" });

    const [result] = await db.insert(practiceMediaFiles).values({
      practiceId,
      name,
      type: type || "file",
      size,
      url: url || "",
      category: category || "General",
      storageDriver: storageDriver || "local",
      storageLocation: storageLocation || "",
    });

    res.json({
      success: true,
      item: {
        id: String(result.insertId),
        name,
        type: type || "file",
        size,
        url: url || "",
        category: category || "General",
        storageDriver: storageDriver || "local",
        storageLocation: storageLocation || "",
        date: new Date().toLocaleDateString("en-GB"),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save media file", error: error.message });
  }
});

router.delete("/media/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    await db.delete(practiceMediaFiles).where(and(eq(practiceMediaFiles.id, id), eq(practiceMediaFiles.practiceId, practiceId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete media file" });
  }
});

export default router;
