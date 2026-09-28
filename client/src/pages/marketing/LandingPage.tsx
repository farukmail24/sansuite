import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import TrustBar from "./TrustBar";
import StatsCounter from "./StatsCounter";
import ModulesShowcase from "./ModulesShowcase";
import WhySanSuite from "./WhySanSuite";
import DashboardShowcase from "./DashboardShowcase";
import IntegrationPartners from "./IntegrationPartners";
import RoiCalculator from "./RoiCalculator";
import TestimonialsSection from "./TestimonialsSection";
import BlogTeaser from "./BlogTeaser";
import Footer from "./Footer";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  const { data: landingData = {} } = useQuery({
    queryKey: ["/api/public/cms/landing-data"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/public/cms/landing-data");
        if (!res.ok) throw new Error("Failed to fetch landing data");
        return res.json();
      } catch {
        return {};
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const {
    settings = {},
    hero = {},
    modules = [],
    testimonials = [],
  } = landingData;

  let pageConfig: any = {};
  try {
    pageConfig = typeof settings.pageSectionsConfig === "string"
      ? JSON.parse(settings.pageSectionsConfig)
      : (settings.pageSectionsConfig || {});
  } catch {
    pageConfig = {};
  }

  const visibility = pageConfig.visibility || {};
  const ctaConfig = pageConfig.homeCta || {
    heading: "Ready to modernise your accountancy practice?",
    subtitle: "Join hundreds of UK firms eliminating disconnected software silos with SanSuite's unified cloud suite.",
    buttonText: "Book a 1-on-1 Practice Demo",
    buttonUrl: "/book-demo",
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.replace("#", "");
        // Use slight delay to ensure dynamic content and images are rendered
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 150);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-purple-500 selection:text-white transition-colors duration-200">
      {/* 1. Header & Navigation */}
      <Navbar
        announcementText={settings.headerAnnouncementText}
        announcementLink={settings.headerAnnouncementLink}
        announcementActive={settings.headerAnnouncementActive}
      />

      {/* 2. Hero Section */}
      {visibility.homeHero !== false && (
        <HeroSection
          badgeText={hero.badgeText}
          title={hero.title}
          highlightWord={hero.highlightWord}
          subtitle={hero.subtitle}
          primaryCtaText={hero.primaryCtaText}
          primaryCtaUrl={hero.primaryCtaUrl}
          secondaryCtaText={hero.secondaryCtaText}
          secondaryCtaUrl={hero.secondaryCtaUrl}
          ratingScore={hero.ratingScore}
          ratingCount={hero.ratingCount}
        />
      )}

      {/* 3. Statutory Trust Bar */}
      {visibility.homeTrustBar !== false && (
        <TrustBar config={pageConfig.trustBar} />
      )}

      {/* 4. NEW: Animated Stats Counters */}
      {visibility.homeStats !== false && (
        <StatsCounter />
      )}

      {/* 5. 10 Core Accounting Modules Showcase */}
      {visibility.homeModules !== false && (
        <ModulesShowcase modules={modules} />
      )}

      {/* 6. NEW: Why SanSuite — Zigzag Feature Highlights */}
      {visibility.homeWhySansuite !== false && (
        <WhySanSuite />
      )}

      {/* 7. NEW: Dashboard Showcase — Full-Width Annotated Screenshot */}
      {visibility.homeDashboardShowcase !== false && (
        <DashboardShowcase />
      )}

      {/* 8. NEW: Integration Partners */}
      {visibility.homeIntegrations !== false && (
        <IntegrationPartners />
      )}

      {/* 9. Interactive Practice ROI & Efficiency Calculator */}
      {visibility.homeRoi !== false && (
        <RoiCalculator config={pageConfig.roiCalculator} />
      )}

      {/* 10. Client Testimonials & Social Proof */}
      {visibility.homeTestimonials !== false && (
        <TestimonialsSection testimonials={testimonials} />
      )}

      {/* 11. NEW: UK Accounting Insights & Blog Guides */}
      {visibility.homeBlog !== false && (
        <BlogTeaser />
      )}

      {/* 12. Bottom Conversion CTA Banner */}
      {visibility.homeCta !== false && (
        <section className="py-20 bg-gradient-to-br from-purple-700 via-[#6c5ce7] to-indigo-900 text-white relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Sparkles size={14} className="text-amber-300" />
              <span>Full UK Statutory Parity</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto">
              {ctaConfig.heading}
            </h2>
            <p className="text-base sm:text-lg text-purple-100 max-w-2xl mx-auto font-light">
              {ctaConfig.subtitle}
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={ctaConfig.buttonUrl || "/book-demo"}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-purple-900 font-bold hover:bg-purple-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-sm"
              >
                <span>{ctaConfig.buttonText || "Book a 1-on-1 Practice Demo"}</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-purple-900/40 text-white font-bold border border-white/20 hover:bg-purple-900/60 transition-all text-sm"
              >
                <span>View Transparent Pricing</span>
              </Link>
            </div>
            <div className="pt-2 flex items-center justify-center gap-6 text-xs text-purple-200">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Unlimited Staff Users</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>HMRC & Companies House Gateway</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Zero Lock-In Contracts</span>
              </span>
            </div>
          </motion.div>
        </section>
      )}

      {/* 12. Comprehensive UK Multi-Column Footer */}
      <Footer siteSettings={settings} />
    </div>
  );
}
