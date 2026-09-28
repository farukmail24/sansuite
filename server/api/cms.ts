import { Router } from "express";
import { db } from "../db";
import {
  cmsSiteSettings,
  cmsHeroSlides,
  cmsModules,
  cmsPricingPlans,
  cmsTestimonials,
  cmsFaqs,
  cmsBlogPosts,
  cmsLeadInquiries,
} from "../../shared/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

// ==============================================================================
// 1. PUBLIC CMS ROUTER (No Auth - High Speed Cached Read Operations)
// ==============================================================================
export const publicCmsRouter = Router();

const DEFAULT_CMS_MODULES = [
  {
    id: 1,
    slug: "practice-management",
    title: "Practice Management & CRM",
    shortDescription: "Centralized client onboarding, AML KYC verification, automated statutory deadlines, and staff timesheets.",
    detailedDescription: "Complete control over your practice workflows. Automate risk assessments, track HMRC deadlines with zero spreadsheet maintenance, and manage staff capacity effortlessly.",
    iconName: "Briefcase",
    category: "Practice",
    badgeTag: "Core Engine",
    sortOrder: 1,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Automated HMRC & Companies House Deadlines",
      "Built-in AML & Risk Assessment Scoring",
      "Client CRM with Multi-Entity Hierarchy",
      "Staff Timesheets & Capacity Planning",
      "Integrated Proposal & Letter of Engagement Builder"
    ]),
  },
  {
    id: 2,
    slug: "accounts-production",
    title: "Accounts Production (FRS 102/105)",
    shortDescription: "Statutory annual accounts for FRS 102 Section 1A, FRS 105 Micro-entities, with automated iXBRL tagging.",
    detailedDescription: "Prepare compliant statutory financial statements directly from trial balances. Full direct gateway integration with Companies House and HMRC for one-click digital submissions.",
    iconName: "Building2",
    category: "Accounting",
    badgeTag: "HMRC Recognized",
    sortOrder: 2,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "FRS 102 (1A) & FRS 105 Compliance",
      "Automated iXBRL Tagging & Validation Engine",
      "Direct One-Click Companies House Filing",
      "Dynamic Chart of Accounts Mapping",
      "Audit-Ready Detailed Notes & Disclosures"
    ]),
  },
  {
    id: 3,
    slug: "bookkeeping",
    title: "Bookkeeping & MTD VAT",
    shortDescription: "Intuitive digital sales invoicing, bill capture, bank statement imports, and MTD for VAT digital submissions.",
    detailedDescription: "Cloud bookkeeping built for seamless accountant-client collaboration. Clients can invoice on the go, while your firm gets pristine reconciled trial balance data with zero re-keying.",
    iconName: "FileSpreadsheet",
    category: "Accounting",
    badgeTag: "MTD Compliant",
    sortOrder: 3,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Automated Bank Feed Reconciliation",
      "MTD for VAT Direct HMRC Submission",
      "Digital Sales Invoicing & Purchase Bills",
      "CIS Deductions & Domestic Reverse Charge Support",
      "Multi-Currency & Real-Time Cash Flow Reports"
    ]),
  },
  {
    id: 4,
    slug: "corporation-tax",
    title: "Corporation Tax (CT600)",
    shortDescription: "Comprehensive CT600 tax returns with automatic computation linking directly from Accounts Production.",
    detailedDescription: "Save hours on company tax filings. Automatically pull figures from financial statements, calculate capital allowances, R&D credits, and submit the joint accounts & CT600 pack to HMRC.",
    iconName: "Calculator",
    category: "Tax",
    badgeTag: "HMRC Gateway",
    sortOrder: 4,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Automated Trial Balance to CT600 Link",
      "AIA & Capital Allowances Calculator",
      "Loss Relief Carry-Back & Allocation Tool",
      "Direct HMRC Tax Gateway Submission",
      "Detailed PDF Tax Computation Packs"
    ]),
  },
  {
    id: 5,
    slug: "self-assessment",
    title: "Self Assessment (SA100)",
    shortDescription: "Individual, partnership (SA800), and trust (SA900) tax return filing with instant tax calculation.",
    detailedDescription: "Streamline the January tax crunch. Capture employment, self-employment, UK/foreign property income, dividends, and capital gains with instant HMRC tax liability breakdown.",
    iconName: "UserCheck",
    category: "Tax",
    badgeTag: "HMRC Direct",
    sortOrder: 5,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "SA100, SA800, and SA900 Form Modules",
      "Employment & Property Schedules Aggregation",
      "Instant HMRC Tax Calculation Preview",
      "Client Digital Approval Integration",
      "HMRC Direct Online Filing with IRmark"
    ]),
  },
  {
    id: 6,
    slug: "payroll",
    title: "Payroll & RTI",
    shortDescription: "Automated pay runs, workplace pension auto-enrolment, CIS returns, P11D benefits, and RTI submissions.",
    detailedDescription: "Reliable cloud payroll for practices handling dozens of client payrolls. Run bulk payrolls in minutes, generate GDPR-compliant payslips, and dispatch RTI FPS/EPS automatically.",
    iconName: "Users",
    category: "Compliance",
    badgeTag: "RTI Certified",
    sortOrder: 6,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Full RTI FPS & EPS Direct Submissions",
      "Auto-Enrolment Nest, Smart & Now Pensions Sync",
      "CIS Monthly Return & Subcontractor Statements",
      "P11D Expenses & Benefits Generator",
      "Employee Self-Service Payslip Access"
    ]),
  },
  {
    id: 7,
    slug: "company-secretarial",
    title: "Company Secretarial (CoSec)",
    shortDescription: "Real-time Companies House synchronization, company incorporation, and Confirmation Statements (CS01).",
    detailedDescription: "Never miss a statutory filing. Seamlessly incorporate new UK limited companies, file CS01 Confirmation Statements with PSC verification, and produce board minutes and resolutions.",
    iconName: "Layers",
    category: "Compliance",
    badgeTag: "Companies House",
    sortOrder: 7,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Live Companies House Two-Way API Sync",
      "Company Incorporation in under 3 Hours",
      "Confirmation Statement (CS01) Direct Filing",
      "Statutory Register of Directors, PSC & Members",
      "Automated Board Minutes & Resolution Templates"
    ]),
  },
  {
    id: 8,
    slug: "mtd-it",
    title: "MTD for Income Tax (MTD IT)",
    shortDescription: "Quarterly updates, cumulative progression tracking, bridging CSV templates, and End of Year final declarations.",
    detailedDescription: "Prepare your firm for the largest UK tax transition. Support sole traders and landlords with 3-month quarterly updates, client approval signatures, and annual final tax reconciliations.",
    iconName: "FileText",
    category: "Tax",
    badgeTag: "MTD IT Ready",
    sortOrder: 8,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Quarterly & Cumulative Progression Tracking",
      "Spreadsheet Bridging CSV Template Engine",
      "Capisign Client Approval Integration",
      "HMRC Sandbox & Live MTD IT Gateway",
      "End of Year Adjustments & Final Declaration"
    ]),
  },
  {
    id: 9,
    slug: "capisign",
    title: "SanSuite Sign (Unlimited eSign)",
    shortDescription: "Unlimited legally binding electronic signatures with audit trail certificates and real-time tracking.",
    detailedDescription: "Eliminate printing, postage, and scanning. Send annual accounts, letters of engagement, and tax returns for digital signature on any device with legal compliance under eIDAS.",
    iconName: "Send",
    category: "Practice",
    badgeTag: "Unlimited",
    sortOrder: 9,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Unlimited Signatures Included in Every Plan",
      "Full Audit Trail with IP & Timestamp Verification",
      "Legally Binding under UK & EU eIDAS Regulations",
      "Customizable Signing Field Placement",
      "Automated Reminder Sequences for Faster Signing"
    ]),
  },
  {
    id: 10,
    slug: "client-portal-365",
    title: "Client Portal 365",
    shortDescription: "Modern white-label portal for SME clients to upload documents, review tax returns, and sign approvals.",
    detailedDescription: "Provide a modern 365 digital client experience. Eliminate unsecure email attachments, share statutory reports securely, and request missing documents with one click.",
    iconName: "Globe",
    category: "Practice",
    badgeTag: "White-Label",
    sortOrder: 10,
    isFeatured: true,
    isActive: true,
    bulletPoints: JSON.stringify([
      "Fully Responsive 24/7 Client Mobile Access",
      "Secure Bank-Grade Document Vault",
      "One-Click Document Approval & Sign-Off",
      "Real-Time Tax Liability & Due Date Visibility",
      "Firm-Branded Experience with Custom Subdomain"
    ]),
  }
];

const DEFAULT_SETTINGS = {
  siteName: "SanSuite",
  siteTagline: "The Unified Cloud Operating System for UK Accounting Practices",
  contactEmail: "contact@sansuite.co.uk",
  contactPhone: "+44 (0) 20 8000 0000",
  officeAddress: "1 Canada Square, Canary Wharf, London, E14 5AA, United Kingdom",
  headerAnnouncementText: "HMRC Making Tax Digital for Income Tax (MTD IT) Live & Fully Compliant",
  headerAnnouncementLink: "/solutions/mtd-it",
  headerAnnouncementActive: true,
};

const DEFAULT_HERO = {
  badgeText: "HMRC & Companies House Recognized Software",
  title: "The Unified Cloud Operating System for Modern UK Accounting Practices",
  highlightWord: "Unified Cloud Operating System",
  subtitle:
    "Say goodbye to fragmented desktop tools and clunky bridging spreadsheets. SanSuite integrates Practice Management, FRS 102/105 Accounts Production, CT600 Corporation Tax, SA100, MTD VAT, RTI Payroll, CoSec, and Unlimited eSign into one single, high-speed platform.",
  primaryCtaText: "Book a 1-on-1 Practice Demo",
  primaryCtaUrl: "/book-demo",
  secondaryCtaText: "Explore All 10 Modules",
  secondaryCtaUrl: "#modules",
  ratingScore: "4.9",
  ratingCount: 1420,
};

// Combined Landing Page Data (Single round-trip for optimal Web Vitals)
publicCmsRouter.get("/landing-data", async (_req, res) => {
  try {
    const [settings] = await db.select().from(cmsSiteSettings).limit(1);
    const [hero] = await db
      .select()
      .from(cmsHeroSlides)
      .where(eq(cmsHeroSlides.isActive, true))
      .orderBy(asc(cmsHeroSlides.sortOrder))
      .limit(1);

    const modules = await db
      .select()
      .from(cmsModules)
      .where(eq(cmsModules.isActive, true))
      .orderBy(asc(cmsModules.sortOrder));

    const pricing = await db
      .select()
      .from(cmsPricingPlans)
      .where(eq(cmsPricingPlans.isActive, true))
      .orderBy(asc(cmsPricingPlans.sortOrder));

    const testimonials = await db
      .select()
      .from(cmsTestimonials)
      .where(eq(cmsTestimonials.isActive, true))
      .orderBy(asc(cmsTestimonials.sortOrder));

    const faqs = await db
      .select()
      .from(cmsFaqs)
      .where(eq(cmsFaqs.isActive, true))
      .orderBy(asc(cmsFaqs.sortOrder));

    const featuredBlogs = await db
      .select()
      .from(cmsBlogPosts)
      .where(eq(cmsBlogPosts.isPublished, true))
      .orderBy(desc(cmsBlogPosts.publishedAt))
      .limit(3);

    res.json({
      settings: settings || DEFAULT_SETTINGS,
      hero: hero || DEFAULT_HERO,
      modules: modules.length > 0 ? modules : DEFAULT_CMS_MODULES,
      pricing: pricing || [],
      testimonials: testimonials || [],
      faqs: faqs || [],
      featuredBlogs: featuredBlogs || [],
    });
  } catch (error: any) {
    console.error("Failed to fetch public landing data, serving resilient defaults:", error.message);
    res.json({
      settings: DEFAULT_SETTINGS,
      hero: DEFAULT_HERO,
      modules: DEFAULT_CMS_MODULES,
      pricing: [],
      testimonials: [],
      faqs: [],
      featuredBlogs: [],
    });
  }
});

// List all active modules
publicCmsRouter.get("/modules", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cmsModules)
      .where(eq(cmsModules.isActive, true))
      .orderBy(asc(cmsModules.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Single module by slug
publicCmsRouter.get("/modules/:slug", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(cmsModules)
      .where(and(eq(cmsModules.slug, req.params.slug), eq(cmsModules.isActive, true)))
      .limit(1);

    if (!row) return res.status(404).json({ message: "Module not found" });
    res.json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Site Settings
publicCmsRouter.get("/site-settings", async (_req, res) => {
  try {
    const [settings] = await db.select().from(cmsSiteSettings).limit(1);
    res.json(settings || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pricing plans
publicCmsRouter.get("/pricing", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cmsPricingPlans)
      .where(eq(cmsPricingPlans.isActive, true))
      .orderBy(asc(cmsPricingPlans.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FAQs
publicCmsRouter.get("/faqs", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const query = db
      .select()
      .from(cmsFaqs)
      .where(category ? and(eq(cmsFaqs.isActive, true), eq(cmsFaqs.category, category)) : eq(cmsFaqs.isActive, true))
      .orderBy(asc(cmsFaqs.sortOrder));

    const rows = await query;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Testimonials
publicCmsRouter.get("/testimonials", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cmsTestimonials)
      .where(eq(cmsTestimonials.isActive, true))
      .orderBy(asc(cmsTestimonials.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Blog Posts
publicCmsRouter.get("/blogs", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cmsBlogPosts)
      .where(eq(cmsBlogPosts.isPublished, true))
      .orderBy(desc(cmsBlogPosts.publishedAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Single Blog Post by slug
publicCmsRouter.get("/blogs/:slug", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(cmsBlogPosts)
      .where(and(eq(cmsBlogPosts.slug, req.params.slug), eq(cmsBlogPosts.isPublished, true)))
      .limit(1);

    if (!row) return res.status(404).json({ message: "Article not found" });
    res.json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Lead Inquiry / Demo Booking
publicCmsRouter.post("/leads", async (req, res) => {
  try {
    const {
      fullName,
      workEmail,
      phoneNumber,
      practiceName,
      clientCountBracket,
      interestedModules,
      message,
      inquiryType = "book_demo",
    } = req.body;

    if (!fullName || !workEmail) {
      return res.status(400).json({ message: "Full name and work email are required" });
    }

    const [inserted] = await db.insert(cmsLeadInquiries).values({
      fullName,
      workEmail,
      phoneNumber: phoneNumber || null,
      practiceName: practiceName || null,
      clientCountBracket: clientCountBracket || "50 - 150",
      interestedModules: Array.isArray(interestedModules) ? JSON.stringify(interestedModules) : interestedModules || null,
      message: message || null,
      inquiryType,
      status: "new",
    });

    res.status(201).json({
      success: true,
      id: (inserted as any)?.insertId,
      message: "Thank you for contacting SanSuite. Our UK practice advisory team will reach out to you shortly.",
    });
  } catch (error: any) {
    console.error("Failed to submit lead inquiry:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==============================================================================
// 2. ADMIN CMS ROUTER (Superadmin / System Admin Panel)
// ==============================================================================
export const adminCmsRouter = Router();

// Site Settings
adminCmsRouter.get("/site-settings", async (_req, res) => {
  try {
    const [settings] = await db.select().from(cmsSiteSettings).limit(1);
    res.json(settings || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/site-settings", async (req, res) => {
  try {
    const existing = await db.select().from(cmsSiteSettings).limit(1);
    const data = { ...req.body };
    if (data.pageSectionsConfig && typeof data.pageSectionsConfig === 'object') {
      data.pageSectionsConfig = JSON.stringify(data.pageSectionsConfig);
    }
    if (data.socialLinks && typeof data.socialLinks === 'object') {
      data.socialLinks = JSON.stringify(data.socialLinks);
    }
    delete data.id;
    delete data.updatedAt;

    if (existing.length > 0) {
      await db.update(cmsSiteSettings).set(data).where(eq(cmsSiteSettings.id, existing[0].id));
    } else {
      await db.insert(cmsSiteSettings).values(data);
    }
    const [updated] = await db.select().from(cmsSiteSettings).limit(1);
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Hero Slides
adminCmsRouter.get("/hero", async (_req, res) => {
  try {
    const [hero] = await db.select().from(cmsHeroSlides).orderBy(asc(cmsHeroSlides.sortOrder)).limit(1);
    res.json(hero || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/hero", async (req, res) => {
  try {
    const existing = await db.select().from(cmsHeroSlides).limit(1);
    if (existing.length > 0) {
      await db.update(cmsHeroSlides).set(req.body).where(eq(cmsHeroSlides.id, existing[0].id));
    } else {
      await db.insert(cmsHeroSlides).values(req.body);
    }
    const [updated] = await db.select().from(cmsHeroSlides).limit(1);
    res.json({ success: true, hero: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modules CRUD
adminCmsRouter.get("/modules", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsModules).orderBy(asc(cmsModules.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.post("/modules", async (req, res) => {
  try {
    const data = { ...req.body };
    if (Array.isArray(data.bulletPoints)) {
      data.bulletPoints = JSON.stringify(data.bulletPoints);
    }
    if (Array.isArray(data.workflowSteps) || (typeof data.workflowSteps === 'object' && data.workflowSteps !== null)) {
      data.workflowSteps = JSON.stringify(data.workflowSteps);
    }
    const [inserted] = await db.insert(cmsModules).values(data);
    res.status(201).json({ success: true, id: (inserted as any)?.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/modules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    if (Array.isArray(data.bulletPoints)) {
      data.bulletPoints = JSON.stringify(data.bulletPoints);
    }
    if (Array.isArray(data.workflowSteps) || (typeof data.workflowSteps === 'object' && data.workflowSteps !== null)) {
      data.workflowSteps = JSON.stringify(data.workflowSteps);
    }
    delete data.id;
    delete data.createdAt;
    await db.update(cmsModules).set(data).where(eq(cmsModules.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.delete("/modules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(cmsModules).where(eq(cmsModules.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pricing Plans CRUD
adminCmsRouter.get("/pricing", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsPricingPlans).orderBy(asc(cmsPricingPlans.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.post("/pricing", async (req, res) => {
  try {
    const data = { ...req.body };
    if (Array.isArray(data.featuresList)) {
      data.featuresList = JSON.stringify(data.featuresList);
    }
    const [inserted] = await db.insert(cmsPricingPlans).values(data);
    res.status(201).json({ success: true, id: (inserted as any)?.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/pricing/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    if (Array.isArray(data.featuresList)) {
      data.featuresList = JSON.stringify(data.featuresList);
    }
    delete data.id;
    await db.update(cmsPricingPlans).set(data).where(eq(cmsPricingPlans.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.delete("/pricing/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(cmsPricingPlans).where(eq(cmsPricingPlans.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Testimonials CRUD
adminCmsRouter.get("/testimonials", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsTestimonials).orderBy(asc(cmsTestimonials.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.post("/testimonials", async (req, res) => {
  try {
    const [inserted] = await db.insert(cmsTestimonials).values(req.body);
    res.status(201).json({ success: true, id: (inserted as any)?.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/testimonials/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    delete data.id;
    await db.update(cmsTestimonials).set(data).where(eq(cmsTestimonials.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.delete("/testimonials/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(cmsTestimonials).where(eq(cmsTestimonials.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FAQs CRUD
adminCmsRouter.get("/faqs", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsFaqs).orderBy(asc(cmsFaqs.sortOrder));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.post("/faqs", async (req, res) => {
  try {
    const [inserted] = await db.insert(cmsFaqs).values(req.body);
    res.status(201).json({ success: true, id: (inserted as any)?.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/faqs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = { ...req.body };
    delete data.id;
    await db.update(cmsFaqs).set(data).where(eq(cmsFaqs.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.delete("/faqs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(cmsFaqs).where(eq(cmsFaqs.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lead Inquiries & CRM
adminCmsRouter.get("/leads", async (_req, res) => {
  try {
    const rows = await db.select().from(cmsLeadInquiries).orderBy(desc(cmsLeadInquiries.createdAt));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.put("/leads/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    await db
      .update(cmsLeadInquiries)
      .set({ status, ...(notes !== undefined ? { notes } : {}) })
      .where(eq(cmsLeadInquiries.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminCmsRouter.delete("/leads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(cmsLeadInquiries).where(eq(cmsLeadInquiries.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
