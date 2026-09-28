import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";
import {
  Building2, Briefcase, FileSpreadsheet, Calculator, UserCheck,
  Users, Layers, FileText, Send, Globe, ChevronDown, ArrowRight,
  ShieldCheck, CheckCircle2, Menu, X, Sparkles, LayoutDashboard
} from "lucide-react";

interface Props {
  announcementText?: string;
  announcementLink?: string;
  announcementActive?: boolean;
}

export default function Navbar({
  announcementText = "HMRC Making Tax Digital for Income Tax (MTD IT) Live & Fully Compliant",
  announcementLink = "/solutions/mtd-it",
  announcementActive = true,
}: Props) {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const handleScrollToWhySanSuite = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location === "/" || location === "/home") {
      const el = document.getElementById("why-sansuite");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", "#why-sansuite");
      }
    } else {
      setLocation("/#why-sansuite");
      setTimeout(() => {
        const el = document.getElementById("why-sansuite");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const modulesList = [
    { title: "Practice Management", desc: "CRM, deadlines, AML & onboarding", href: "/solutions/practice-management", icon: Briefcase, tag: "Core" },
    { title: "Accounts Production", desc: "FRS 102 (1A) & FRS 105 iXBRL", href: "/solutions/accounts-production", icon: Building2, tag: "Companies House" },
    { title: "Bookkeeping & MTD VAT", desc: "Invoicing, bank feeds & VAT return", href: "/solutions/bookkeeping", icon: FileSpreadsheet, tag: "HMRC Direct" },
    { title: "Corporation Tax (CT600)", desc: "Company tax returns & computations", href: "/solutions/corporation-tax", icon: Calculator, tag: "Joint Filing" },
    { title: "Self Assessment (SA100)", desc: "Individual, partnership & trust tax", href: "/solutions/self-assessment", icon: UserCheck, tag: "HMRC Direct" },
    { title: "Payroll & RTI", desc: "Auto-enrolment pensions, CIS & FPS", href: "/solutions/payroll", icon: Users, tag: "RTI Certified" },
    { title: "Company Secretarial", desc: "Live Companies House sync & CS01", href: "/solutions/company-secretarial", icon: Layers, tag: "CoSec" },
    { title: "MTD for Income Tax", desc: "Quarterly updates & EOY declaration", href: "/solutions/mtd-it", icon: FileText, tag: "New 2026" },
    { title: "SanSuite Sign (eSign)", desc: "Unlimited legally binding signatures", href: "/solutions/capisign", icon: Send, tag: "Unlimited" },
    { title: "Client Portal 365", desc: "White-label 24/7 client portal hub", href: "/solutions/client-portal-365", icon: Globe, tag: "SME Hub" },
  ];

  return (
    <header className="sticky top-0 z-50 transition-all duration-300">
      {/* Top Announcement Bar */}
      {announcementActive && announcementText && (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-[#6c5ce7] dark:from-purple-950 dark:via-indigo-950 dark:to-slate-950 text-white text-xs py-2 px-4 border-b border-purple-500/20 dark:border-purple-800/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-purple-200">UK Compliance Update:</span>
              <span className="text-slate-200 truncate">{announcementText}</span>
            </div>
            {announcementLink && (
              <Link
                href={announcementLink}
                className="hidden sm:inline-flex items-center gap-1 font-bold text-purple-300 hover:text-white transition-colors text-[11px] underline flex-shrink-0"
              >
                Learn More <ArrowRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <nav
        className={`w-full transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-md dark:shadow-lg dark:shadow-black/20 py-3"
            : "bg-white/80 dark:bg-slate-950/70 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-800/50 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6c5ce7] to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Building2 size={22} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  San<span className="text-[#6c5ce7]">Suite</span>
                </span>
                <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded">
                  UK
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                Cloud Accounting
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${
                  productsOpen ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60" : ""
                }`}
              >
                <span>Modules</span>
                <ChevronDown size={14} className={`transition-transform ${productsOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Mega-Menu Panel */}
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-[680px] pt-2 z-50">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          The SanSuite Modular Platform
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          All 10 modules connect to a single unified database with zero double-entry.
                        </p>
                      </div>
                      <Link
                        href="/pricing"
                        onClick={() => setProductsOpen(false)}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
                      >
                        View All Packages
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {modulesList.map((m) => {
                        const Icon = m.icon;
                        return (
                          <Link
                            key={m.href}
                            href={m.href}
                            onClick={() => setProductsOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-[#6c5ce7] flex items-center justify-center flex-shrink-0 group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                                  {m.title}
                                </span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {m.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{m.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/#why-sansuite"
              onClick={handleScrollToWhySanSuite}
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              Why SanSuite
            </a>

            <Link
              href="/pricing"
              className={`px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${
                location === "/pricing" ? "text-purple-600 dark:text-white bg-purple-50 dark:bg-slate-800/60 font-bold" : ""
              }`}
            >
              Pricing
            </Link>

            <Link
              href="/solutions/mtd-it"
              className="px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              MTD for IT
            </Link>

            <Link
              href="/contact"
              className={`px-3 py-2 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${
                location === "/contact" ? "text-purple-600 dark:text-white bg-purple-50 dark:bg-slate-800/60 font-bold" : ""
              }`}
            >
              Contact
            </Link>
          </div>

          {/* Right Action CTAs & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Interactive Theme Switcher (Default Light, click for Dark) */}
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to App ({user?.firstName || "Dashboard"})</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors shadow-sm"
              >
                Client Sign In
              </Link>
            )}

            <Link
              href="/book-demo"
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6c5ce7] to-indigo-600 hover:from-[#5b4bc4] hover:to-indigo-500 rounded-xl shadow-md shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:-translate-y-0.5"
            >
              Book Free Demo
            </Link>
          </div>

          {/* Mobile Right Controls: Theme Toggle & Hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Solutions</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {modulesList.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300 font-medium block truncate"
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1 font-semibold text-slate-700 dark:text-slate-200">
              <a
                href="/#why-sansuite"
                onClick={handleScrollToWhySanSuite}
                className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-slate-700 dark:text-slate-200"
              >
                Why SanSuite
              </a>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                Pricing Plans
              </Link>
              <Link href="/solutions/mtd-it" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                Making Tax Digital Hub
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                Contact & Support
              </Link>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={15} />
                  <span>Go to App ({user?.firstName || "Dashboard"})</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700"
                >
                  Client Sign In
                </Link>
              )}
              <Link
                href="/book-demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center font-bold text-white bg-[#6c5ce7] rounded-xl shadow-md"
              >
                Book Free Demo
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
