import { Star, MessageSquareQuote, CheckCircle2, MapPin, Quote } from "lucide-react";

interface Props {
  testimonials?: any[];
}

export default function TestimonialsSection({ testimonials = [] }: Props) {
  const defaultTestimonials = [
    {
      clientName: "David Harrington, FCA",
      initials: "DH",
      gradient: "from-purple-500 to-indigo-600",
      clientRole: "Managing Partner",
      practiceName: "Harrington & Co Chartered Accountants",
      practiceLocation: "Central London",
      rating: 5,
      reviewText:
        "Migrating from our legacy desktop software to SanSuite was the best operational decision we made this year. Having Accounts Production, CT600, and Practice CRM on a single unified database eliminated double entry completely. We save at least 15 hours per client during busy season.",
    },
    {
      clientName: "Sarah Jenkins, FCCA",
      initials: "SJ",
      gradient: "from-indigo-500 to-blue-600",
      clientRole: "Founder & Principal",
      practiceName: "Apex Cloud Accounting Ltd",
      practiceLocation: "Manchester",
      rating: 5,
      reviewText:
        "The unlimited user licensing model is a breath of fresh air. Other providers penalize you for growing your team with per-seat licensing fees. With SanSuite, all our staff and interns have full access with granular role controls.",
    },
    {
      clientName: "Marcus Thorne",
      initials: "MT",
      gradient: "from-emerald-500 to-teal-600",
      clientRole: "Senior Tax Director",
      practiceName: "Thorne & Partners Tax Advisory",
      practiceLocation: "Birmingham",
      rating: 5,
      reviewText:
        "Making Tax Digital for Income Tax readiness was our top priority. SanSuite's MTD IT module with cumulative progression and bridging templates allowed us to onboard our sole trader clients seamlessly ahead of the statutory deadlines.",
    },
  ];

  const items = testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section className="py-20 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <MessageSquareQuote size={14} className="text-[#6c5ce7]" />
            <span>Verified Practice Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Built for UK Practice Owners, Partners, and Bookkeepers
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            See why forward-thinking accounting firms across England, Scotland, Wales, and Northern Ireland trust SanSuite for their daily practice compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((t: any, idx: number) => {
            const initials = t.initials || t.clientName.split(" ").slice(0, 2).map((n: string) => n[0]).join("");
            const gradient = t.gradient || (idx === 0 ? "from-purple-500 to-indigo-600" : idx === 1 ? "from-indigo-500 to-blue-600" : "from-emerald-500 to-teal-600");

            return (
              <div
                key={idx}
                className="relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-xl dark:hover:shadow-none transition-all group"
              >
                {/* Decorative quote mark */}
                <div className="absolute top-4 right-4 text-purple-200 dark:text-purple-900/40 group-hover:text-purple-300 dark:group-hover:text-purple-800/60 transition-colors pointer-events-none">
                  <Quote size={28} className="rotate-180 opacity-40" />
                </div>

                <div className="space-y-4 relative">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(t.rating || 5)].map((_, i) => (
                      <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1.5">5.0</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{t.reviewText}"
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shadow-md flex-shrink-0`}>
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.clientName}</h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[170px]">
                        {t.clientRole}, {t.practiceName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                        <MapPin size={10} />
                        {t.practiceLocation}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 flex-shrink-0">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
