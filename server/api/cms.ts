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
      settings: settings || {
        siteName: "SanSuite",
        siteTagline: "The Unified Cloud Operating System for UK Accounting Practices",
        contactEmail: "contact@sansuite.co.uk",
        contactPhone: "+44 (0) 20 8000 0000",
        officeAddress: "1 Canada Square, Canary Wharf, London, E14 5AA, United Kingdom",
        headerAnnouncementText: "HMRC Making Tax Digital for Income Tax (MTD IT) Live & Fully Compliant",
        headerAnnouncementLink: "/solutions/mtd-it",
        headerAnnouncementActive: true,
      },
      hero: hero || {
        badgeText: "HMRC & Companies House Recognized",
        title: "The Unified Cloud Operating System for Modern UK Accounting Practices",
        highlightWord: "Unified Cloud Operating System",
        subtitle:
          "Say goodbye to fragmented desktop tools. SanSuite unifies Practice Management, FRS 102/105 Accounts Production, CT600 Corporation Tax, SA100, MTD VAT, RTI Payroll, CoSec, and Unlimited eSign into a single high-speed cloud platform.",
        primaryCtaText: "Book a 1-on-1 Practice Demo",
        primaryCtaUrl: "/book-demo",
        secondaryCtaText: "Explore All 10 Modules",
        secondaryCtaUrl: "#modules",
        ratingScore: "4.9",
        ratingCount: 1420,
      },
      modules,
      pricing,
      testimonials,
      faqs,
      featuredBlogs,
    });
  } catch (error: any) {
    console.error("Failed to fetch public landing data:", error);
    res.status(500).json({ error: error.message });
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
