import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Partner {
  name: string;
  description: string;
}

const partners: Partner[] = [
  { name: "HMRC", description: "MTD VAT, SA100, CT600, RTI" },
  { name: "Companies House", description: "iXBRL, CS01, Formations" },
  { name: "Open Banking", description: "Live Bank Feed Reconciliation" },
  { name: "Stripe", description: "Client Payment Collection" },
  { name: "GoCardless", description: "Direct Debit Subscriptions" },
  { name: "Xero", description: "Bookkeeping Data Import" },
];

function PartnerLogo({ partner, index }: { partner: Partner; index: number }) {
  const initials = partner.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  const colors: Record<string, string> = {
    HMRC: "from-emerald-600 to-emerald-700",
    "Companies House": "from-blue-600 to-blue-700",
    "Open Banking": "from-indigo-600 to-indigo-700",
    Stripe: "from-violet-600 to-violet-700",
    GoCardless: "from-cyan-600 to-cyan-700",
    Xero: "from-sky-500 to-sky-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="flex flex-col items-center gap-3 group cursor-default"
    >
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${
          colors[partner.name] || "from-purple-600 to-purple-700"
        } flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md group-hover:shadow-xl transition-all duration-300`}
      >
        {initials}
      </div>
      <div className="text-center">
        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
          {partner.name}
        </p>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
          {partner.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function IntegrationPartners() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={14} className="text-[#6c5ce7]" />
            <span>Seamless Integrations</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Connected to the UK Statutory Infrastructure
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            SanSuite integrates directly with HMRC, Companies House, Open Banking, and leading payment platforms — no bridging software required.
          </p>
        </motion.div>

        {/* Partner Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {partners.map((partner, idx) => (
            <PartnerLogo key={partner.name} partner={partner} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
