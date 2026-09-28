import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ShieldCheck, CheckCircle2, Play, Sparkles, Star,
  Briefcase, Building2, Calculator, FileText, Check, Users, Layers
} from "lucide-react";

interface Props {
  badgeText?: string;
  title?: string;
  highlightWord?: string;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  ratingScore?: string;
  ratingCount?: number;
}

export default function HeroSection({
  badgeText = "HMRC & Companies House Recognized Software",
  title = "The Unified Cloud Operating System for Modern UK Accounting Practices",
  highlightWord = "Unified Cloud Operating System",
  subtitle = "Say goodbye to fragmented desktop tools and clunky bridging spreadsheets. SanSuite integrates Practice Management, FRS 102/105 Accounts Production, CT600 Corporation Tax, SA100, MTD VAT, RTI Payroll, CoSec, and Unlimited eSign into one single, high-speed platform.",
  primaryCtaText = "Book a 1-on-1 Practice Demo",
  primaryCtaUrl = "/book-demo",
  secondaryCtaText = "Explore All 10 Modules",
  secondaryCtaUrl = "#modules",
  ratingScore = "4.9",
  ratingCount = 1420,
}: Props) {
  const [activePreviewTab, setActivePreviewTab] = useState<"practice" | "accounts" | "mtd">("practice");

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-purple-50/70 via-white to-slate-50 dark:from-purple-950/20 dark:via-slate-950 dark:to-slate-950 text-slate-900 dark:text-white pt-12 pb-24 md:pt-16 md:pb-32 border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      {/* 1. Subtle Low-Opacity Background Architectural Photography */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <img
          src="/images/marketing/hero-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center opacity-[0.06] dark:opacity-[0.14] filter grayscale contrast-125 dark:mix-blend-luminosity scale-105"
        />
        {/* Soft edge masking and vignette gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-50/80 via-transparent to-slate-50 dark:from-slate-950/70 dark:via-transparent dark:to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 via-transparent to-purple-100/30 dark:from-slate-950/80 dark:via-transparent dark:to-slate-950/80" />
      </div>

      {/* 2. Background Glows & Architectural Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#6c5ce7]/10 dark:bg-[#6c5ce7]/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-indigo-600/10 dark:bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* 3. Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f00f_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f00f_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Top Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-sm dark:shadow-inner dark:shadow-purple-500/10 backdrop-blur-md"
        >
          <ShieldCheck size={14} className="text-[#6c5ce7]" />
          <span>{badgeText}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </motion.div>

        {/* Hero Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto space-y-4"
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            {title.includes(highlightWord) ? (
              <>
                {title.split(highlightWord)[0]}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-[#6c5ce7] dark:from-purple-400 dark:via-indigo-300 dark:to-[#6c5ce7]">
                  {highlightWord}
                </span>
                {title.split(highlightWord)[1]}
              </>
            ) : (
              title
            )}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            {subtitle}
          </p>
        </motion.div>

        {/* Action Buttons & Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <Link
            href={primaryCtaUrl}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-[#6c5ce7] via-indigo-600 to-[#5b4bc4] hover:from-[#5b4bc4] hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>{primaryCtaText}</span>
            <ArrowRight size={16} />
          </Link>

          <a
            href={secondaryCtaUrl}
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm flex items-center justify-center gap-2"
          >
            <span>{secondaryCtaText}</span>
          </a>
        </motion.div>

        {/* Rating and Social Proof Tag */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-slate-500 dark:text-slate-400"
        >
          <div className="flex items-center gap-2">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">{ratingScore}/5 Rating</span>
            <span className="text-slate-400 dark:text-slate-500">({ratingCount}+ UK Practices)</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Zero Double Entry</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Unlimited Staff Users Included</span>
          </div>
        </motion.div>

        {/* Interactive 3D / Glassmorphism Software Preview Mockup with Motion */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="pt-8 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl bg-white dark:bg-gradient-to-b dark:from-slate-800/80 dark:to-slate-900/90 p-2 sm:p-3 border border-slate-200 dark:border-slate-700/70 shadow-2xl shadow-purple-900/10 dark:shadow-purple-950/40 backdrop-blur-xl">
            {/* Window Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono pl-2 hidden sm:inline">
                  https://app.sansuite.co.uk/ecosystem/dashboard
                </span>
              </div>

              {/* Mockup Tab Switchers */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setActivePreviewTab("practice")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    activePreviewTab === "practice"
                      ? "bg-[#6c5ce7] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Practice CRM
                </button>
                <button
                  onClick={() => setActivePreviewTab("accounts")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    activePreviewTab === "accounts"
                      ? "bg-[#6c5ce7] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Accounts FRS 102
                </button>
                <button
                  onClick={() => setActivePreviewTab("mtd")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    activePreviewTab === "mtd"
                      ? "bg-[#6c5ce7] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  MTD for Income Tax
                </button>
              </div>
            </div>

            {/* Mockup Body Content with Animated Tab Transition */}
            <div className="bg-slate-50/70 dark:bg-slate-950/80 rounded-xl p-4 sm:p-6 text-left border border-slate-200/80 dark:border-slate-800/80 min-h-[160px]">
              <AnimatePresence mode="wait">
                {activePreviewTab === "practice" && (
                  <motion.div
                    key="practice"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-[#6c5ce7] flex items-center justify-center font-bold">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Practice Workspace</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">42 Clients Onboarded • 18 Statutory Deadlines This Month</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        Companies House & HMRC Live Sync
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Pending Confirmation Statements</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">12 Due (CS01)</div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Automated client alerts active</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">AML Risk Assessments</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">98.4% Compliant</div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Photo ID & KYC Verified</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">SanSuite eSign Documents</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">29 Completed</div>
                        <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold">Zero per-envelope cost</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activePreviewTab === "accounts" && (
                  <motion.div
                    key="accounts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Accounts Production (FRS 102 Section 1A / FRS 105)</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-balancing Trial Balance • Direct iXBRL Filing to Companies House</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                        iXBRL UK GAAP Validated
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Turnover (Current Year)</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">£842,500.00</div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">+18.4% vs Prior Period</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Operating Profit (P&L)</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">£164,220.00</div>
                        <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold">Tied to CT600 computation</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Balance Sheet Status</span>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">Balanced (£0 Diff)</div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Ready for Director Signature</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activePreviewTab === "mtd" && (
                  <motion.div
                    key="mtd"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Making Tax Digital for Income Tax (ITSA)</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Quarterly Summaries • Cumulative Progression • Final Declaration</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                        HMRC ITSA Compliant
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Quarter 3 Update</span>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">HMRC Accepted</div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Ack Ref: HMRC-ITSA-9942</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative Net Profit</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">£58,400.00</div>
                        <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold">Est. Tax & NIC: £12,850</span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Client Digital Records</span>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-1">100% Synced</div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Direct Bankfeed Matched</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
