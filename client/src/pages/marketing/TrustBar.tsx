import { motion } from "framer-motion";
import { ShieldCheck, Building2, CheckCircle2, Lock, Cloud, Award } from "lucide-react";

interface TrustBadge {
  title: string;
  subtitle: string;
  badge: string;
  iconName?: string;
}

interface TrustBarProps {
  config?: {
    eyebrow?: string;
    heading?: string;
    badges?: TrustBadge[];
  };
}

const ICON_MAP: Record<string, any> = {
  Award,
  Building2,
  CheckCircle2,
  Lock,
  Cloud,
  ShieldCheck,
};

const DEFAULT_BADGES: TrustBadge[] = [
  {
    title: "HMRC Recognized",
    subtitle: "MTD VAT, MTD IT, CT600 & RTI",
    badge: "Direct Digital Gateway",
    iconName: "Award",
  },
  {
    title: "Companies House",
    subtitle: "Direct electronic iXBRL filings",
    badge: "One-Click Submission",
    iconName: "Building2",
  },
  {
    title: "ICAEW & ACCA Standard",
    subtitle: "FRS 102 (1A) & FRS 105 compliant",
    badge: "Statutory Taxonomies",
    iconName: "CheckCircle2",
  },
  {
    title: "Bank-Grade Encryption",
    subtitle: "AES-256 data security at rest",
    badge: "UK Data Residency",
    iconName: "Lock",
  },
  {
    title: "99.99% Cloud Uptime",
    subtitle: "ISO 27001 certified data centers",
    badge: "Auto-Failover SLA",
    iconName: "Cloud",
  },
];

export default function TrustBar({ config }: TrustBarProps) {
  const eyebrow = config?.eyebrow || "Enterprise Security & UK Statutory Compliance";
  const heading = config?.heading || "Trusted by UK Chartered Accountants, CPAs, and Independent Accounting Practices";
  const badges = config?.badges && config.badges.length > 0 ? config.badges : DEFAULT_BADGES;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-10 text-slate-800 dark:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-1"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            {eyebrow}
          </span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {heading}
          </h3>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {badges.map((c, idx) => {
            const IconComponent = (c.iconName && ICON_MAP[c.iconName]) || [Award, Building2, CheckCircle2, Lock, Cloud][idx % 5] || ShieldCheck;
            return (
              <motion.div
                key={c.title + idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-[#6c5ce7] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                    <IconComponent size={16} />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {c.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{c.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
