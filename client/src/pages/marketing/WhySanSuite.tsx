import { CheckCircle2, Sparkles } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  bullets: string[];
  image: string;
}

const features: Feature[] = [
  {
    title: "Cloud-First Architecture, Zero Desktop Installs",
    description:
      "Access your entire practice from any browser, any device. SanSuite's cloud infrastructure eliminates version conflicts, manual backups, and IT overhead — your data is always current, always secure, always available.",
    bullets: [
      "Real-time multi-user collaboration across staff",
      "Automatic nightly encrypted cloud backups",
      "Works on Windows, Mac, iPad, and Chrome OS",
      "Zero software installation or IT dependency",
    ],
    image: "/images/marketing/cloud-architecture.jpg",
  },
  {
    title: "Direct HMRC & Companies House Filing Gateway",
    description:
      "File CT600 Corporation Tax, SA100 Self Assessment, MTD VAT, RTI Payroll, and Confirmation Statements directly from SanSuite — no third-party bridging software, no CSV exports, no manual re-entry.",
    bullets: [
      "iXBRL validated Accounts Production for Companies House",
      "Live HMRC status tracking with acknowledgement receipts",
      "Automated statutory deadline alerts per client",
      "End-to-end audit trail for regulatory compliance",
    ],
    image: "/images/marketing/hmrc-integration.jpg",
  },
  {
    title: "Unlimited Staff Users — Zero Per-Seat Penalties",
    description:
      "Unlike competitors that charge per user, every SanSuite subscription includes unlimited staff logins. Grow your team, onboard interns, and expand without worrying about escalating licence fees.",
    bullets: [
      "Role-based access control (Partner, Manager, Staff, Intern)",
      "Individual audit trails and activity logging",
      "Concurrent multi-user access with zero conflicts",
      "Dedicated onboarding support for new team members",
    ],
    image: "/images/marketing/team-collaboration.jpg",
  },
];

export default function WhySanSuite() {
  return (
    <section id="why-sansuite" className="scroll-mt-24 py-20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background glow */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[400px] bg-purple-600/5 dark:bg-purple-800/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <Sparkles size={14} className="text-[#6c5ce7]" />
            <span>Why UK Practices Choose SanSuite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Built for the Way Accountants Actually Work
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Every feature in SanSuite is purpose-built around UK statutory requirements, practice workflows, and real accountant feedback.
          </p>
        </div>

        {/* Zigzag Features */}
        {features.map((feature, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            } items-center gap-10 lg:gap-16`}
          >
            {/* Text Side */}
            <div className="flex-1 space-y-5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
              <div className="space-y-3 pt-2">
                {feature.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Side */}
            <div className="flex-1 w-full">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl shadow-purple-900/10 dark:shadow-purple-950/30 group">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
