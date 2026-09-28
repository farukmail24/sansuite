import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Building2, FileSpreadsheet, Calculator, UserCheck,
  Users, Layers, FileText, Send, Globe, CheckCircle2, ArrowRight,
  Sparkles
} from "lucide-react";
import { DEFAULT_MARKETING_MODULES, type MarketingModule } from "./constants/defaultModules";

interface Props {
  modules?: any[];
}

export default function ModulesShowcase({ modules = [] }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Fallback to DEFAULT_MARKETING_MODULES if CMS database returns empty or is offline
  const effectiveModules: any[] = (modules && modules.length > 0)
    ? modules
    : DEFAULT_MARKETING_MODULES;

  const iconMap: Record<string, any> = {
    Briefcase,
    Building2,
    FileSpreadsheet,
    Calculator,
    UserCheck,
    Users,
    Layers,
    FileText,
    Send,
    Globe,
  };

  const categories = ["All", "Practice", "Accounting", "Tax", "Compliance"];

  const filteredModules = effectiveModules.filter((m) => {
    if (activeCategory === "All") return true;
    return m.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <section id="modules" className="scroll-mt-24 py-20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-purple-600/5 dark:bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header with Scroll Motion */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={14} className="text-[#6c5ce7]" />
            <span>Comprehensive UK Software Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            10 Connected Modules. One Unified Cloud Database.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            No more CSV exports or manually re-typing trial balance figures. When your clients reconcile invoices in Bookkeeping, the data automatically feeds Accounts Production, CT600 Corporation Tax, and Practice Deadlines.
          </p>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeCategory === cat
                  ? "bg-[#6c5ce7] text-white shadow-md shadow-purple-500/25 scale-[1.02]"
                  : "bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800"
              }`}
            >
              {cat === "All" ? "All 10 Modules" : cat}
            </button>
          ))}
        </motion.div>

        {/* Modules Grid with Staggered Motion */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredModules.map((m, idx) => {
              const Icon = iconMap[m.iconName] || Briefcase;
              let bulletList: string[] = [];
              try {
                bulletList = Array.isArray(m.bulletPoints)
                  ? m.bulletPoints
                  : JSON.parse(m.bulletPoints || "[]");
              } catch {
                bulletList = [];
              }

              return (
                <motion.div
                  layout
                  key={m.slug}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.04 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/90 hover:border-purple-400 dark:hover:border-purple-500/40 hover:bg-purple-50/20 dark:hover:bg-slate-900 transition-colors flex flex-col justify-between group shadow-sm hover:shadow-xl dark:shadow-none"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-[#6c5ce7] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors duration-200 shadow-sm">
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/25">
                        {m.badgeTag || m.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {m.shortDescription}
                      </p>
                    </div>

                    {bulletList.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        {bulletList.slice(0, 4).map((bp: string, bIdx: number) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{bp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                    <Link
                      href={`/solutions/${m.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    >
                      <span>Explore Workflow</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform duration-200" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
