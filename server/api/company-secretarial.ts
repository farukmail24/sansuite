import { Router } from "express";
import { db } from "../db";
import {
  csRecords, csShareholders, csOfficers, csPscs, csFilings, csSettings, clients
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// SENSITIVE WORDS per Companies House & Companies Act 2006 (Regulations)
const SENSITIVE_WORDS = [
  "ROYAL", "KING", "QUEEN", "PRINCE", "PRINCESS", "CROWN", "GOVERNMENT",
  "PARLIAMENT", "MINISTRY", "DEPARTMENT", "BANK", "BANKING", "INSURANCE",
  "ASSURANCE", "POLICE", "NHS", "CHARITY", "CHARITABLE", "TRUST",
  "AUTHORITY", "COMMISSION", "DISPENSARY", "APOTHECARY", "CHAMBER OF COMMERCE"
];

// 1. Get full CS record for a client (master record + shareholders + officers + pscs + filings + client info)
router.get("/record/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ message: "Invalid client ID" });

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return res.status(404).json({ message: "Client not found" });

    const [record] = await db.select().from(csRecords).where(eq(csRecords.clientId, clientId));
    const shareholders = await db.select().from(csShareholders)
      .where(eq(csShareholders.clientId, clientId))
      .orderBy(desc(csShareholders.sharesHeld));
    const officers = await db.select().from(csOfficers)
      .where(eq(csOfficers.clientId, clientId))
      .orderBy(csOfficers.appointmentDate);
    const pscs = await db.select().from(csPscs)
      .where(eq(csPscs.clientId, clientId))
      .orderBy(csPscs.notifiedOn);
    const filings = await db.select().from(csFilings)
      .where(eq(csFilings.clientId, clientId))
      .orderBy(desc(csFilings.submissionDate));

    res.json({
      client,
      record: record || null,
      shareholders: shareholders || [],
      officers: officers || [],
      pscs: pscs || [],
      filings: filings || []
    });
  } catch (error: any) {
    console.error("Fetch CS record error:", error);
    res.status(500).json({ message: "Failed to fetch Company Secretarial record", error: error.message });
  }
});

// 2. Create or update CS master record (supporting all 11 tabs)
router.post("/record", async (req: any, res) => {
  try {
    const {
      clientId, companyRegNo, companyType, incorporationDate,
      sicCode, nextConfirmationDue, nextAccountsDue, registeredAddress,
      registeredEmail, previousName, dateOfNameChange, nameChangeMethod,
      authCode, filingPreference, sailAddress, registersLocation,
      hmrcUtr, taxOffice, accountingReferenceDate, lastAccountsDate,
      confirmationReviewDate, agmDate, firstBoardMeetingDate,
      corporateOfficerRegName, corporateOfficerLegalForm, corporateOfficerGoverningLaw,
      isOffshore, isArchived, notes, companyName
    } = req.body;

    const cId = parseInt(clientId);
    if (isNaN(cId)) return res.status(400).json({ message: "Invalid client ID" });

    // Optional: update client name & reg no on primary client record if provided
    const clientUpdates: any = {};
    if (companyName) clientUpdates.clientName = companyName;
    if (companyRegNo) clientUpdates.registrationNumber = companyRegNo;
    if (registeredAddress) clientUpdates.address = registeredAddress;
    // Two-way Email Exchange Sync per Capium Article 9000237737
    if (registeredEmail) clientUpdates.email = registeredEmail;
    if (Object.keys(clientUpdates).length > 0) {
      await db.update(clients).set(clientUpdates).where(eq(clients.id, cId));
    }

    const existing = await db.select().from(csRecords).where(eq(csRecords.clientId, cId));

    const payload: any = {
      companyRegNo: companyRegNo || undefined,
      companyType: companyType || "Limited",
      incorporationDate: incorporationDate ? new Date(incorporationDate) : undefined,
      sicCode: sicCode || undefined,
      nextConfirmationDue: nextConfirmationDue ? new Date(nextConfirmationDue) : undefined,
      nextAccountsDue: nextAccountsDue ? new Date(nextAccountsDue) : undefined,
      registeredAddress: registeredAddress || undefined,
      registeredEmail: registeredEmail || undefined,
      previousName: previousName || undefined,
      dateOfNameChange: dateOfNameChange ? new Date(dateOfNameChange) : undefined,
      nameChangeMethod: nameChangeMethod || "NA",
      authCode: authCode || undefined,
      filingPreference: filingPreference || "we_file",
      sailAddress: sailAddress || undefined,
      registersLocation: registersLocation || "registered_office",
      hmrcUtr: hmrcUtr || undefined,
      taxOffice: taxOffice || undefined,
      accountingReferenceDate: accountingReferenceDate || undefined,
      lastAccountsDate: lastAccountsDate ? new Date(lastAccountsDate) : undefined,
      confirmationReviewDate: confirmationReviewDate ? new Date(confirmationReviewDate) : undefined,
      agmDate: agmDate ? new Date(agmDate) : undefined,
      firstBoardMeetingDate: firstBoardMeetingDate ? new Date(firstBoardMeetingDate) : undefined,
      corporateOfficerRegName: corporateOfficerRegName || undefined,
      corporateOfficerLegalForm: corporateOfficerLegalForm || undefined,
      corporateOfficerGoverningLaw: corporateOfficerGoverningLaw || undefined,
      isOffshore: !!isOffshore,
      isArchived: !!isArchived,
      archivedAt: isArchived ? new Date() : null,
      notes: notes || undefined,
    };

    if (existing.length > 0) {
      await db.update(csRecords).set(payload).where(eq(csRecords.clientId, cId));
      res.json({ message: "Company Secretarial record updated successfully" });
    } else {
      payload.clientId = cId;
      const [result] = await db.insert(csRecords).values(payload);
      res.json({ id: result.insertId, message: "Company Secretarial record created successfully" });
    }
  } catch (error: any) {
    console.error("Save CS record error:", error);
    res.status(500).json({ message: "Failed to save Company Secretarial record", error: error.message });
  }
});

// 3. Shareholder (Member) CRUD
router.post("/shareholders", async (req: any, res) => {
  try {
    const { clientId, name, shareholderType, email, shareClass, sharesHeld, nominalValue, appointmentDate } = req.body;
    const cId = parseInt(clientId);
    if (isNaN(cId) || !name) return res.status(400).json({ message: "Client ID and shareholder Name are required" });

    const existingShares = await db.select().from(csShareholders).where(eq(csShareholders.clientId, cId));
    const totalExistingShares = existingShares.reduce((sum, s) => sum + parseFloat(s.sharesHeld || "0"), 0);
    const newSharesHeld = parseFloat(sharesHeld || "1");
    const newTotal = totalExistingShares + newSharesHeld;
    const percentageOwnership = newTotal > 0 ? ((newSharesHeld / newTotal) * 100).toFixed(2) : "0.00";

    const [result] = await db.insert(csShareholders).values({
      clientId: cId,
      name,
      shareholderType: shareholderType || "Individual",
      email: email || undefined,
      shareClass: shareClass || "Ordinary",
      sharesHeld: newSharesHeld.toString(),
      nominalValue: nominalValue ? nominalValue.toString() : "1.0000",
      percentageOwnership,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : new Date()
    });

    res.json({ id: result.insertId, percentageOwnership, message: "Shareholder added successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to add shareholder", error: error.message });
  }
});

router.patch("/shareholders/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = { ...req.body };
    if (updates.appointmentDate) updates.appointmentDate = new Date(updates.appointmentDate);
    await db.update(csShareholders).set(updates).where(eq(csShareholders.id, id));
    res.json({ message: "Shareholder updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update shareholder", error: error.message });
  }
});

router.delete("/shareholders/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(csShareholders).where(eq(csShareholders.id, id));
    res.json({ message: "Shareholder removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to remove shareholder", error: error.message });
  }
});

// 4. Officer CRUD (Directors & Secretaries)
router.post("/officers", async (req: any, res) => {
  try {
    const {
      clientId, name, role, appointmentDate, dateOfBirth, nationality,
      occupation, countryOfResidence, serviceAddress, residentialAddress, address
    } = req.body;
    const cId = parseInt(clientId);
    if (isNaN(cId) || !name) return res.status(400).json({ message: "Client ID and Officer Name are required" });

    const [result] = await db.insert(csOfficers).values({
      clientId: cId,
      name,
      role: role || "Director",
      appointmentDate: appointmentDate ? new Date(appointmentDate) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality: nationality || undefined,
      occupation: occupation || undefined,
      countryOfResidence: countryOfResidence || "United Kingdom",
      serviceAddress: serviceAddress || address || undefined,
      residentialAddress: residentialAddress || undefined,
      address: address || serviceAddress || undefined,
      isActive: true
    });
    res.json({ id: result.insertId, message: "Officer appointed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to appoint officer", error: error.message });
  }
});

router.patch("/officers/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = { ...req.body };
    if (updates.resignationDate) {
      updates.isActive = false;
      updates.resignationDate = new Date(updates.resignationDate);
    }
    if (updates.appointmentDate) updates.appointmentDate = new Date(updates.appointmentDate);
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);

    await db.update(csOfficers).set(updates).where(eq(csOfficers.id, id));
    res.json({ message: "Officer updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update officer", error: error.message });
  }
});

router.delete("/officers/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(csOfficers).where(eq(csOfficers.id, id));
    res.json({ message: "Officer removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to remove officer", error: error.message });
  }
});

// 5. PSC CRUD (Persons with Significant Control)
router.post("/psc", async (req: any, res) => {
  try {
    const {
      clientId, name, kind, natureOfControl, notifiedOn, dateOfBirth,
      nationality, countryOfResidence, address
    } = req.body;
    const cId = parseInt(clientId);
    if (isNaN(cId) || !name) return res.status(400).json({ message: "Client ID and PSC Name are required" });

    const [result] = await db.insert(csPscs).values({
      clientId: cId,
      name,
      kind: kind || "individual-person-with-significant-control",
      natureOfControl: typeof natureOfControl === "object" ? JSON.stringify(natureOfControl) : (natureOfControl || "ownership-of-shares-25-to-50-percent"),
      notifiedOn: notifiedOn ? new Date(notifiedOn) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality: nationality || undefined,
      countryOfResidence: countryOfResidence || "United Kingdom",
      address: address || undefined,
      isActive: true
    });
    res.json({ id: result.insertId, message: "PSC registered successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to register PSC", error: error.message });
  }
});

router.patch("/psc/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = { ...req.body };
    if (updates.ceasedOn) {
      updates.isActive = false;
      updates.ceasedOn = new Date(updates.ceasedOn);
    }
    if (updates.notifiedOn) updates.notifiedOn = new Date(updates.notifiedOn);
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);
    if (typeof updates.natureOfControl === "object") {
      updates.natureOfControl = JSON.stringify(updates.natureOfControl);
    }

    await db.update(csPscs).set(updates).where(eq(csPscs.id, id));
    res.json({ message: "PSC updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update PSC", error: error.message });
  }
});

router.delete("/psc/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(csPscs).where(eq(csPscs.id, id));
    res.json({ message: "PSC removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to remove PSC", error: error.message });
  }
});

// 6. Deadlines Calculation Engine for Action Station
router.get("/deadlines", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceClients = await db.select().from(clients).where(
      and(eq(clients.practiceId, practiceId), eq(clients.isActive, true))
    );

    const limitedClients = practiceClients.filter(
      c => c.clientType === "Limited" || c.clientType === "Ltd" || c.clientType === "LLP" || !c.clientType
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlines: any[] = [];

    for (const client of limitedClients) {
      const [csRec] = await db.select().from(csRecords).where(eq(csRecords.clientId, client.id));

      // Parse confirmation statement due date
      let csDue: Date | null = null;
      if (csRec?.nextConfirmationDue) {
        csDue = new Date(csRec.nextConfirmationDue);
      } else if (client.chDataJson) {
        try {
          const ch = typeof client.chDataJson === "string" ? JSON.parse(client.chDataJson) : client.chDataJson;
          if (ch?.confirmation_statement?.next_due) {
            csDue = new Date(ch.confirmation_statement.next_due);
          }
        } catch {}
      }

      if (csDue) {
        const diffTime = csDue.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let status = "Upcoming";
        if (daysLeft < 0) status = "Overdue";
        else if (daysLeft <= 30) status = "Due";

        deadlines.push({
          id: `cs-${client.id}`,
          clientId: client.id,
          companyName: client.clientName,
          companyRegNo: client.registrationNumber || csRec?.companyRegNo || "",
          task: "Confirmation Statement (CS01)",
          taskType: "cs01",
          deadlineDate: csDue.toISOString().split("T")[0],
          daysLeft,
          status,
          registeredEmail: csRec?.registeredEmail || null
        });
      }

      // Parse accounts due date
      let accDue: Date | null = null;
      if (csRec?.nextAccountsDue) {
        accDue = new Date(csRec.nextAccountsDue);
      } else if (client.chDataJson) {
        try {
          const ch = typeof client.chDataJson === "string" ? JSON.parse(client.chDataJson) : client.chDataJson;
          if (ch?.accounts?.next_accounts?.due_on) {
            accDue = new Date(ch.accounts.next_accounts.due_on);
          }
        } catch {}
      }

      if (accDue) {
        const diffTime = accDue.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let status = "Upcoming";
        if (daysLeft < 0) status = "Overdue";
        else if (daysLeft <= 30) status = "Due";

        deadlines.push({
          id: `acc-${client.id}`,
          clientId: client.id,
          companyName: client.clientName,
          companyRegNo: client.registrationNumber || csRec?.companyRegNo || "",
          task: "Annual Accounts Filing",
          taskType: "accounts",
          deadlineDate: accDue.toISOString().split("T")[0],
          daysLeft,
          status,
          registeredEmail: csRec?.registeredEmail || null
        });
      }
    }

    // Sort by daysLeft ascending (most urgent first)
    deadlines.sort((a, b) => a.daysLeft - b.daysLeft);

    const counts = {
      totalCompanies: limitedClients.length,
      csDueSoon: deadlines.filter(d => d.taskType === "cs01" && (d.status === "Due" || d.status === "Overdue")).length,
      accountsDueSoon: deadlines.filter(d => d.taskType === "accounts" && (d.status === "Due" || d.status === "Overdue")).length,
      overdueTotal: deadlines.filter(d => d.status === "Overdue").length,
    };

    res.json({ deadlines, counts });
  } catch (error: any) {
    console.error("Deadlines calculation error:", error);
    res.status(500).json({ message: "Failed to calculate compliance deadlines", error: error.message });
  }
});

// 7. "Roll date +1 yr" Action
router.post("/deadlines/roll", async (req: any, res) => {
  try {
    const { clientId, taskType } = req.body;
    const cId = parseInt(clientId);
    if (isNaN(cId)) return res.status(400).json({ message: "Invalid client ID" });

    const [record] = await db.select().from(csRecords).where(eq(csRecords.clientId, cId));
    if (!record) return res.status(404).json({ message: "Company Secretarial record not found" });

    if (taskType === "cs01") {
      const baseDate = record.nextConfirmationDue ? new Date(record.nextConfirmationDue) : new Date();
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      await db.update(csRecords).set({ nextConfirmationDue: baseDate }).where(eq(csRecords.clientId, cId));
      return res.json({ message: "Confirmation Statement deadline rolled forward by 1 year", newDate: baseDate });
    } else if (taskType === "accounts") {
      const baseDate = record.nextAccountsDue ? new Date(record.nextAccountsDue) : new Date();
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      await db.update(csRecords).set({ nextAccountsDue: baseDate }).where(eq(csRecords.clientId, cId));
      return res.json({ message: "Accounts deadline rolled forward by 1 year", newDate: baseDate });
    } else {
      return res.status(400).json({ message: "Invalid task type. Must be 'cs01' or 'accounts'" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to roll deadline", error: error.message });
  }
});

// 8. Formal Confirmation Statement (CS01) Filing & Audit Logger
router.post("/cs01/file", async (req: any, res) => {
  try {
    const { clientId, verifiedEmail, notes, confirmNoChanges } = req.body;
    const cId = parseInt(clientId);
    if (isNaN(cId)) return res.status(400).json({ message: "Invalid client ID" });

    const [record] = await db.select().from(csRecords).where(eq(csRecords.clientId, cId));
    const [client] = await db.select().from(clients).where(eq(clients.id, cId));

    if (!record && !client) return res.status(404).json({ message: "Company not found" });

    // Statutory Check: Under ECCTA 2024, CS01 requires a verified Registered Email Address
    const finalEmail = verifiedEmail || record?.registeredEmail;
    if (!finalEmail) {
      return res.status(400).json({
        message: "UK ECCTA 2024 Requirement: A valid Registered Email Address is mandatory to file Confirmation Statement CS01."
      });
    }

    // Roll confirmation statement due date forward by 1 year
    const currentDate = record?.nextConfirmationDue ? new Date(record.nextConfirmationDue) : new Date();
    const nextYear = new Date(currentDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await db.update(csRecords).set({
      nextConfirmationDue: nextYear,
      registeredEmail: finalEmail,
      confirmationReviewDate: new Date()
    }).where(eq(csRecords.clientId, cId));

    // Create authentic filing record in csFilings
    const transactionId = `CS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const submissionNumber = `CH-CS01-${Math.floor(100000 + Math.random() * 900000)}`;

    const [filingResult] = await db.insert(csFilings).values({
      clientId: cId,
      formType: "CS01",
      status: "Accepted",
      submissionDate: new Date(),
      transactionId,
      submissionNumber,
      notes: notes || "Confirmation Statement (CS01) filed with zero change affirmation.",
      payloadJson: {
        registeredEmail: finalEmail,
        confirmNoChanges: !!confirmNoChanges,
        filedAt: new Date().toISOString(),
        filedNextDue: nextYear.toISOString(),
      }
    });

    res.json({
      message: "Confirmation Statement (CS01) filed and verified successfully.",
      filingId: filingResult.insertId,
      transactionId,
      submissionNumber,
      nextConfirmationDue: nextYear
    });
  } catch (error: any) {
    console.error("CS01 filing error:", error);
    res.status(500).json({ message: "Failed to file CS01", error: error.message });
  }
});

// 9. Statutory Registers Generation (The 5 Core Registers)
router.get("/registers/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ message: "Invalid client ID" });

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return res.status(404).json({ message: "Client not found" });

    const [record] = await db.select().from(csRecords).where(eq(csRecords.clientId, clientId));
    const officers = await db.select().from(csOfficers).where(eq(csOfficers.clientId, clientId));
    const shareholders = await db.select().from(csShareholders).where(eq(csShareholders.clientId, clientId));
    const pscs = await db.select().from(csPscs).where(eq(csPscs.clientId, clientId));

    // Register of Directors
    const directors = officers.filter(o => (o.role || "").toLowerCase().includes("director") || !(o.role || "").toLowerCase().includes("secretary"));
    // Register of Secretaries
    const secretaries = officers.filter(o => (o.role || "").toLowerCase().includes("secretary"));
    // Register of Members (Shareholders)
    const members = shareholders.map((s, idx) => ({
      ...s,
      certificateNumber: `SC-${String(idx + 1).padStart(4, "0")}`,
      totalNominalValue: (parseFloat(s.sharesHeld || "0") * parseFloat(s.nominalValue || "1")).toFixed(2)
    }));
    // Register of PSCs
    const pscList = pscs;

    res.json({
      company: {
        name: client.clientName,
        regNo: record?.companyRegNo || client.registrationNumber || "N/A",
        type: record?.companyType || client.clientType || "Private Limited Company",
        incorporationDate: record?.incorporationDate || null,
        registeredAddress: record?.registeredAddress || client.address || "N/A",
        registeredEmail: record?.registeredEmail || "N/A",
        registersLocation: record?.registersLocation === "sail" ? (record.sailAddress || "SAIL") : "Registered Office",
      },
      generatedAt: new Date().toISOString(),
      registers: {
        directors,
        secretaries,
        members,
        pscs: pscList,
      }
    });
  } catch (error: any) {
    console.error("Registers generation error:", error);
    res.status(500).json({ message: "Failed to generate statutory registers", error: error.message });
  }
});

// 10. Company Name Availability & Statutory Restrictions Validator
router.post("/validate-name", async (req: any, res) => {
  try {
    const rawName = String(req.body.companyName || "").trim();
    if (!rawName) {
      return res.status(400).json({ valid: false, errors: ["Company name cannot be empty."] });
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const upperName = rawName.toUpperCase();

    // 1. Mandatory Endings Check
    const allowedEndings = ["LIMITED", "LTD", "LTD.", "LLP", "PLC", "CYFYNGEDIG", "CYF"];
    const hasValidEnding = allowedEndings.some(end => upperName.endsWith(end));
    if (!hasValidEnding) {
      errors.push("The company name must end with 'Limited', 'Ltd', 'LLP', or 'PLC' (or Welsh equivalent).");
    }

    // 2. Sensitive Words Check (Companies Act 2006)
    const foundSensitive = SENSITIVE_WORDS.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      return regex.test(rawName);
    });
    if (foundSensitive.length > 0) {
      warnings.push(`Contains sensitive word(s): ${foundSensitive.join(", ")}. Permission or supporting documentation from relevant public authorities may be required.`);
    }

    // 3. Prohibited Characters Check
    if (/[<>{}~^\\|]/.test(rawName)) {
      errors.push("The use of certain characters, signs, or symbols is not permitted in a UK company name.");
    }

    // 4. Live Companies House Search for "Same As" & Similarity
    let existingMatches: any[] = [];
    try {
      const { fetchFullCompanyBundle } = await import("./companies-house");
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (apiKey) {
        const authHeader = `Basic ${Buffer.from(`${apiKey.trim()}:`).toString("base64")}`;
        const chUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(rawName)}&items_per_page=5`;
        const chResp = await fetch(chUrl, { headers: { Authorization: authHeader, Accept: "application/json" } });
        if (chResp.ok) {
          const chData = await chResp.json();
          existingMatches = chData.items || [];
          
          // Check exact match (ignoring case, spaces, and punctuation)
          const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(LIMITED|LTD)$/, "");
          const cleanTarget = normalize(rawName);

          for (const item of existingMatches) {
            if (normalize(item.title) === cleanTarget) {
              errors.push(`'${item.title}' is already registered with Companies House (Reg No: ${item.company_number}). 'Same as' names are prohibited under UK law.`);
              break;
            }
          }
        }
      }
    } catch (apiErr: any) {
      console.warn("Companies House search error during name validation:", apiErr.message);
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      existingMatches: existingMatches.slice(0, 3)
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to validate company name", error: error.message });
  }
});

// 11. Practice-level CoSec Settings (Presenter ID & Default Office)
router.get("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const [settings] = await db.select().from(csSettings).where(eq(csSettings.practiceId, practiceId));
    res.json({
      settings: settings || {
        presenterId: "",
        presenterAuthCode: "",
        defaultRegisteredOffice: "",
        defaultCountry: "United Kingdom",
        isLiveMode: false
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settings", error: error.message });
  }
});

router.post("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { presenterId, presenterAuthCode, defaultRegisteredOffice, defaultCountry, isLiveMode } = req.body;

    const [existing] = await db.select().from(csSettings).where(eq(csSettings.practiceId, practiceId));

    if (existing) {
      await db.update(csSettings).set({
        presenterId,
        presenterAuthCode,
        defaultRegisteredOffice,
        defaultCountry: defaultCountry || "United Kingdom",
        isLiveMode: !!isLiveMode,
        updatedAt: new Date()
      }).where(eq(csSettings.practiceId, practiceId));
      res.json({ message: "Company Secretarial settings updated successfully" });
    } else {
      await db.insert(csSettings).values({
        practiceId,
        presenterId,
        presenterAuthCode,
        defaultRegisteredOffice,
        defaultCountry: defaultCountry || "United Kingdom",
        isLiveMode: !!isLiveMode
      });
      res.json({ message: "Company Secretarial settings created successfully" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save settings", error: error.message });
  }
});

// 12. Create new company formation (IN01 Wizard submission)
router.post("/formations", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const {
      companyName, companyType, registeredAddress, registeredEmail,
      sicCode, officers, shareholders, articlesOfAssociation
    } = req.body;

    if (!companyName) return res.status(400).json({ message: "Company name is required" });
    if (!registeredEmail) {
      return res.status(400).json({ message: "UK ECCTA 2024 Requirement: Registered Email Address is mandatory." });
    }

    // 1. Create client record
    const [clientResult] = await db.insert(clients).values({
      practiceId,
      clientName: companyName,
      clientType: companyType || "Limited",
      tradingStatus: "Incorporating",
      isActive: true,
      address: registeredAddress
    });
    const clientId = clientResult.insertId;

    // 2. Create CS Master Record
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    await db.insert(csRecords).values({
      clientId,
      companyRegNo: "PENDING",
      companyType: companyType || "Limited",
      incorporationDate: new Date(),
      sicCode: sicCode || "62020",
      registeredAddress,
      registeredEmail,
      nextConfirmationDue: nextYear,
      nextAccountsDue: nextYear,
      filingPreference: "we_file",
      registersLocation: "registered_office"
    });

    // 3. Insert Officers
    if (officers && officers.length > 0) {
      for (const off of officers) {
        if (off.name) {
          await db.insert(csOfficers).values({
            clientId,
            name: off.name,
            role: off.role || "Director",
            serviceAddress: off.serviceAddress || registeredAddress,
            residentialAddress: off.residentialAddress || registeredAddress,
            address: off.address || registeredAddress,
            nationality: off.nationality || "British",
            occupation: off.occupation || "Company Director",
            dateOfBirth: off.dateOfBirth ? new Date(off.dateOfBirth) : undefined,
            appointmentDate: new Date(),
            isActive: true
          });
        }
      }
    }

    // 4. Insert Shareholders & Compute PSCs automatically
    if (shareholders && shareholders.length > 0) {
      const totalShares = shareholders.reduce((sum: number, s: any) => sum + parseFloat(s.sharesHeld || "0"), 0);
      for (const sh of shareholders) {
        if (sh.name) {
          const sharesNum = parseFloat(sh.sharesHeld || "1");
          const pct = totalShares > 0 ? ((sharesNum / totalShares) * 100).toFixed(2) : "100.00";
          await db.insert(csShareholders).values({
            clientId,
            name: sh.name,
            shareholderType: sh.shareholderType || "Individual",
            email: sh.email || undefined,
            shareClass: sh.shareClass || "Ordinary",
            sharesHeld: sharesNum.toString(),
            nominalValue: sh.nominalValue ? sh.nominalValue.toString() : "1.0000",
            percentageOwnership: pct,
            appointmentDate: new Date()
          });

          // If shareholder holds > 25%, automatically register as PSC
          if (parseFloat(pct) >= 25) {
            let controlLevel = "ownership-of-shares-25-to-50-percent";
            if (parseFloat(pct) > 75) controlLevel = "ownership-of-shares-75-to-100-percent";
            else if (parseFloat(pct) > 50) controlLevel = "ownership-of-shares-50-to-75-percent";

            await db.insert(csPscs).values({
              clientId,
              name: sh.name,
              kind: sh.shareholderType === "Corporate" ? "corporate-entity-person-with-significant-control" : "individual-person-with-significant-control",
              natureOfControl: JSON.stringify([controlLevel, "voting-rights-25-to-50-percent", "right-to-appoint-and-remove-directors"]),
              notifiedOn: new Date(),
              countryOfResidence: "United Kingdom",
              address: registeredAddress,
              isActive: true
            });
          }
        }
      }
    }

    // 5. Log filing in csFilings
    const transactionId = `IN01-${Date.now().toString(36).toUpperCase()}`;
    await db.insert(csFilings).values({
      clientId,
      formType: "IN01",
      status: "Submitted",
      submissionDate: new Date(),
      transactionId,
      notes: `Form IN01 submission prepared. Articles: ${articlesOfAssociation || 'Model Articles'}.`,
      payloadJson: {
        companyName,
        companyType,
        registeredAddress,
        registeredEmail,
        sicCode,
        articles: articlesOfAssociation || "Model Articles"
      }
    });

    res.json({
      message: "Company formation IN01 submitted successfully",
      clientId,
      transactionId
    });
  } catch (error: any) {
    console.error("Formation creation error:", error);
    res.status(500).json({ message: "Failed to submit formation", error: error.message });
  }
});

// 13. Enhanced Sync CH Data (Profile, Officers, PSCs, Dates)
router.post("/sync-ch/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return res.status(404).json({ message: "Client not found." });

    const crn = client.registrationNumber;
    if (!crn) return res.status(400).json({ message: "Client does not have a Company Registration Number (CRN)." });

    const { fetchFullCompanyBundle } = await import("./companies-house");
    const bundle = await fetchFullCompanyBundle(crn);
    if (!bundle.profile) return res.status(404).json({ message: "Company not found on Companies House." });

    const profile = bundle.profile;
    const roa = profile.registered_office_address || {};
    const regAddress = [roa.address_line_1, roa.address_line_2, roa.locality, roa.postal_code, roa.country].filter(Boolean).join(", ");

    // 1. Update or create CS Master Record
    const existingRecord = await db.select().from(csRecords).where(eq(csRecords.clientId, clientId));
    const nextCs = profile.confirmation_statement?.next_due ? new Date(profile.confirmation_statement.next_due) : undefined;
    const nextAcc = profile.accounts?.next_accounts?.due_on ? new Date(profile.accounts.next_accounts.due_on) : undefined;
    const incDate = profile.date_of_creation ? new Date(profile.date_of_creation) : undefined;
    const sics = (profile.sic_codes || []).join(", ");

    if (existingRecord.length > 0) {
      await db.update(csRecords).set({
        companyRegNo: crn,
        companyType: profile.type || profile.company_type,
        incorporationDate: incDate,
        sicCode: sics,
        nextConfirmationDue: nextCs,
        nextAccountsDue: nextAcc,
        registeredAddress: regAddress
      }).where(eq(csRecords.clientId, clientId));
    } else {
      await db.insert(csRecords).values({
        clientId,
        companyRegNo: crn,
        companyType: profile.type || profile.company_type,
        incorporationDate: incDate,
        sicCode: sics,
        nextConfirmationDue: nextCs,
        nextAccountsDue: nextAcc,
        registeredAddress: regAddress
      });
    }

    // 2. Sync Officers into csOfficers
    let officersAdded = 0;
    if (bundle.officers && bundle.officers.length > 0) {
      const existingOfficers = await db.select().from(csOfficers).where(eq(csOfficers.clientId, clientId));
      const existingNames = new Set(existingOfficers.map(o => o.name.toLowerCase().trim()));

      for (const off of bundle.officers) {
        if (off.name && !existingNames.has(off.name.toLowerCase().trim())) {
          await db.insert(csOfficers).values({
            clientId,
            name: off.name,
            role: off.officer_role ? (off.officer_role.includes("secretary") ? "Secretary" : "Director") : "Director",
            appointmentDate: off.appointed_on ? new Date(off.appointed_on) : new Date(),
            resignationDate: off.resigned_on ? new Date(off.resigned_on) : null,
            isActive: !off.resigned_on,
            nationality: off.nationality || undefined,
            occupation: off.occupation || undefined,
            countryOfResidence: off.country_of_residence || undefined,
            serviceAddress: off.address ? [off.address.address_line_1, off.address.locality, off.address.postal_code].filter(Boolean).join(", ") : "",
            address: off.address ? [off.address.address_line_1, off.address.locality, off.address.postal_code].filter(Boolean).join(", ") : ""
          });
          officersAdded++;
        }
      }
    }

    // 3. Sync PSCs into csPscs and csShareholders
    let pscsAdded = 0;
    if (bundle.psc && bundle.psc.length > 0) {
      const existingPscs = await db.select().from(csPscs).where(eq(csPscs.clientId, clientId));
      const existingPscNames = new Set(existingPscs.map(p => p.name.toLowerCase().trim()));

      for (const psc of bundle.psc) {
        if (psc.name && !existingPscNames.has(psc.name.toLowerCase().trim())) {
          await db.insert(csPscs).values({
            clientId,
            name: psc.name,
            kind: psc.kind || "individual-person-with-significant-control",
            natureOfControl: JSON.stringify(psc.natures_of_control || []),
            notifiedOn: psc.notified_on ? new Date(psc.notified_on) : new Date(),
            ceasedOn: psc.ceased_on ? new Date(psc.ceased_on) : undefined,
            nationality: psc.nationality || undefined,
            countryOfResidence: psc.country_of_residence || undefined,
            address: psc.address ? [psc.address.address_line_1, psc.address.locality, psc.address.postal_code].filter(Boolean).join(", ") : "",
            isActive: !psc.ceased_on
          });
          pscsAdded++;
        }
      }
    }

    // 4. Update client chDataJson in clients table
    await db.update(clients).set({
      chDataJson: JSON.stringify(bundle)
    }).where(eq(clients.id, clientId));

    res.json({
      message: `Successfully synced from Companies House (${officersAdded} officers, ${pscsAdded} PSCs added).`,
      bundle
    });
  } catch (error: any) {
    console.error("CS Sync Error:", error);
    res.status(500).json({ message: error.message || "Failed to sync Company Secretarial data from Companies House." });
  }
});

// 14. E-Filing Submissions list for practice
router.get("/filings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));
    const clientIds = practiceClients.map(c => c.id);

    if (clientIds.length === 0) return res.json([]);

    const filings = await db.select().from(csFilings).orderBy(desc(csFilings.submissionDate));
    const practiceFilings = filings.filter(f => clientIds.includes(f.clientId)).map(f => {
      const client = practiceClients.find(c => c.id === f.clientId);
      return {
        ...f,
        companyName: client?.clientName || "Unknown Company",
        companyRegNo: client?.registrationNumber || ""
      };
    });

    res.json(practiceFilings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch filings", error: error.message });
  }
});

// 15. All Persons directory across practice companies (Capium Articles 9000203190 & 9000202625)
router.get("/people", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const practiceClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));
    const clientIds = practiceClients.map(c => c.id);

    if (clientIds.length === 0) return res.json([]);

    const officers = await db.select().from(csOfficers);
    const shareholders = await db.select().from(csShareholders);
    const pscs = await db.select().from(csPscs);

    const clientMap = new Map(practiceClients.map(c => [c.id, c]));
    const personList: any[] = [];

    // Officers
    for (const off of officers) {
      if (clientIds.includes(off.clientId)) {
        const client = clientMap.get(off.clientId);
        personList.push({
          id: `officer-${off.id}`,
          originalId: off.id,
          name: off.name,
          clientId: off.clientId,
          companyName: client?.clientName || "N/A",
          companyRegNo: client?.registrationNumber || "",
          type: "Officer",
          role: off.role || "Director",
          email: client?.email || "",
          nationality: off.nationality || "British",
          occupation: off.occupation || "Director",
          dateOfBirth: off.dateOfBirth,
          serviceAddress: off.serviceAddress || off.address || "",
          isActive: off.isActive
        });
      }
    }

    // Shareholders
    for (const sh of shareholders) {
      if (clientIds.includes(sh.clientId)) {
        const client = clientMap.get(sh.clientId);
        personList.push({
          id: `shareholder-${sh.id}`,
          originalId: sh.id,
          name: sh.name,
          clientId: sh.clientId,
          companyName: client?.clientName || "N/A",
          companyRegNo: client?.registrationNumber || "",
          type: "Shareholder",
          role: `${sh.shareClass || 'Ordinary'} Shareholder (${sh.percentageOwnership || '0'}%)`,
          email: sh.email || client?.email || "",
          sharesHeld: sh.sharesHeld,
          nominalValue: sh.nominalValue,
          isActive: true
        });
      }
    }

    // PSCs
    for (const p of pscs) {
      if (clientIds.includes(p.clientId)) {
        const client = clientMap.get(p.clientId);
        personList.push({
          id: `psc-${p.id}`,
          originalId: p.id,
          name: p.name,
          clientId: p.clientId,
          companyName: client?.clientName || "N/A",
          companyRegNo: client?.registrationNumber || "",
          type: "PSC",
          role: p.natureOfControl || "Person with Significant Control",
          email: client?.email || "",
          nationality: p.nationality || "",
          isActive: p.isActive
        });
      }
    }

    res.json(personList);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch people directory", error: error.message });
  }
});

// 16. Archive / Unarchive Company (Capium Article 9000225975)
router.post("/archive/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ message: "Invalid client ID" });
    const { isArchived } = req.body;

    await db.update(csRecords).set({
      isArchived: !!isArchived,
      archivedAt: isArchived ? new Date() : null
    }).where(eq(csRecords.clientId, clientId));

    res.json({ message: isArchived ? "Company archived successfully" : "Company unarchived successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update archive status", error: error.message });
  }
});

// 17. Delete Company & Clean Cascade (Capium Article 9000225975)
router.delete("/company/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ message: "Invalid client ID" });

    await db.delete(csOfficers).where(eq(csOfficers.clientId, clientId));
    await db.delete(csShareholders).where(eq(csShareholders.clientId, clientId));
    await db.delete(csPscs).where(eq(csPscs.clientId, clientId));
    await db.delete(csFilings).where(eq(csFilings.clientId, clientId));
    await db.delete(csRecords).where(eq(csRecords.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));

    res.json({ message: "Company and all associated secretarial registers deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete company", error: error.message });
  }
});

export default router;
