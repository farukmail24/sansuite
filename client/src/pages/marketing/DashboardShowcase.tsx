import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Zap, BarChart3, FileText, Users } from "lucide-react";

const callouts = [
  { icon: <BarChart3 size={14} />, label: "Real-Time Practice Dashboard", position: "top-[12%] left-[3%]" },
  { icon: <Users size={14} />, label: "Unlimited Staff Users", position: "top-[18%] right-[2%]" },
  { icon: <ShieldCheck size={14} />, label: "AML & KYC Verified", position: "top-[52%] left-[2%]" },
  { icon: <FileText size={14} />, label: "Direct HMRC Filing", position: "bottom-[18%] right-[3%]" },
  { icon: <Zap size={14} />, label: "Instant Compliance Status", position: "bottom-[12%] left-[8%]" },
];

export default function DashboardShowcase() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#6c5ce7]/5 dark:bg-[#6c5ce7]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={14} className="text-[#6c5ce7]" />
            <span>See SanSuite in Action</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            One Dashboard. Complete Practice Visibility.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From client onboarding to final statutory filing — every metric, deadline, and compliance status at your fingertips.
          </p>
        </motion.div>

        {/* Dashboard Screenshot with floating callouts and motion */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-6xl mx-auto"
        >
          {/* Main Image Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/70 shadow-2xl shadow-purple-900/15 dark:shadow-purple-950/40 bg-white dark:bg-slate-900">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-400 font-mono ml-2 hidden sm:inline">
                https://app.sansuite.co.uk/practice/dashboard
              </span>
            </div>

            <img
              src="/images/marketing/hero-dashboard.jpg"
              alt="SanSuite Practice Management Dashboard showing client list, compliance status, and deadline tracking"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>

          {/* Floating Callout Badges with Staggered Entrance */}
          {callouts.map((callout, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
              className={`absolute ${callout.position} hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-200 animate-float-gentle`}
              style={{ animationDelay: `${idx * 0.4}s` }}
            >
              <span className="text-[#6c5ce7]">{callout.icon}</span>
              <span>{callout.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-float-gentle {
          animation: float-gentle 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-gentle {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
