import { Link } from "wouter";
import { Sparkles, ArrowRight, Clock, BookOpen } from "lucide-react";

interface Article {
  tag: string;
  tagColor: string;
  readTime: string;
  date: string;
  title: string;
  summary: string;
  image: string;
  link: string;
  author: string;
}

const articles: Article[] = [
  {
    tag: "MTD for Income Tax",
    tagColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    readTime: "5 min read",
    date: "September 2026",
    title: "HMRC MTD for ITSA: The Complete Transition Roadmap for UK Accounting Practices",
    summary:
      "How to audit your sole trader and landlord client base, establish quarterly digital record-keeping workflows, and leverage cumulative progression templates without desktop silos.",
    image: "/images/marketing/blog_mtd_guide.jpg",
    link: "/solutions/mtd-it",
    author: "SanSuite UK Compliance Team",
  },
  {
    tag: "Corporate Tax & FRS 102",
    tagColor: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    readTime: "6 min read",
    date: "September 2026",
    title: "Eliminating Reconciliation Gaps Between Accounts Production and CT600 Computations",
    summary:
      "Why manual bridging between trial balance schedules and statutory tax computations causes filing errors, and how unified ledger mapping resolves it automatically.",
    image: "/images/marketing/blog_tax_updates.jpg",
    link: "/solutions/corporation-tax",
    author: "Chartered Advisory Desk",
  },
  {
    tag: "Practice Operations",
    tagColor: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    readTime: "4 min read",
    date: "August 2026",
    title: "Scaling from 50 to 500 Clients: The Unlimited-User Model vs Per-Seat Legacy Traps",
    summary:
      "A transparent breakdown of practice software overheads, team onboarding friction, and how client portals with integrated eSign eliminate busy-season bottlenecks.",
    image: "/images/marketing/blog_practice_growth.jpg",
    link: "/pricing",
    author: "Practice Operations Group",
  },
];

export default function BlogTeaser() {
  return (
    <section className="py-20 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-200 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[300px] bg-purple-600/5 dark:bg-purple-900/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              <BookOpen size={14} className="text-[#6c5ce7]" />
              <span>UK Accounting Insights & Statutory Guides</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Expert Knowledge for Forward-Thinking Firms
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Stay ahead of HMRC mandates, Companies House regulatory changes, and practice automation best practices with guidance from our UK tax and accounting specialists.
            </p>
          </div>

          <Link
            href="/solutions/mtd-it"
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors group self-start md:self-auto"
          >
            <span>Browse Compliance Hub</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((art, idx) => (
            <article
              key={idx}
              className="group bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-xl dark:hover:shadow-purple-950/20 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Article Image with Zoom Effect */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent pointer-events-none" />
                </div>

                {/* Article Content */}
                <div className="p-6 space-y-3">
                  {/* Meta pill row */}
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${art.tagColor}`}>
                      {art.tag}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                      <Clock size={12} />
                      {art.readTime}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
                    <Link href={art.link}>
                      {art.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {art.summary}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {art.author}
                </span>
                <Link
                  href={art.link}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors group/link"
                >
                  <span>Read Guide</span>
                  <ArrowRight size={13} className="group-link-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
