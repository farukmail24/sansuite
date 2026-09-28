import { Link } from "wouter";
import { Building2, Mail, Phone, MapPin, ShieldCheck, Award, Heart } from "lucide-react";

interface Props {
  siteSettings?: any;
}

export default function Footer({ siteSettings = {} }: Props) {
  const officeAddress =
    siteSettings.officeAddress ||
    "One Canada Square, 38th Floor, Canary Wharf, London, E14 5AA, United Kingdom";
  const contactEmail = siteSettings.contactEmail || "contact@sansuite.co.uk";
  const contactPhone = siteSettings.contactPhone || "+44 (0) 20 7946 0982";
  const companyReg = siteSettings.companyRegNumber || "12345678";
  const vatNumber = siteSettings.vatNumber || "GB 987 6543 21";

  return (
    <footer className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 text-xs transition-colors duration-200">
      {/* Upper CTA Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-[#6c5ce7] dark:from-purple-900/60 dark:via-indigo-950/80 dark:to-slate-950 border-b border-purple-500/20 dark:border-purple-900/40 py-12 px-4 sm:px-6 lg:px-8 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ready to Modernize Your Accounting Practice?
            </h3>
            <p className="text-xs sm:text-sm text-purple-100 dark:text-slate-300">
              Book a personalized 1-on-1 walkthrough with a UK senior practice consultant today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/book-demo"
              className="px-6 py-3 bg-white hover:bg-slate-50 text-purple-700 font-extrabold text-xs rounded-xl shadow-lg transition-colors"
            >
              Book 1-on-1 Demo
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 bg-purple-900/80 hover:bg-purple-950 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors border border-purple-400/30"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand & UK Office */}
          <div className="lg:col-span-2 space-y-4 pr-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6c5ce7] to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Building2 size={18} />
              </div>
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                San<span className="text-[#6c5ce7]">Suite</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              The unified cloud operating system for UK accounting practices. FRS 102/105 Accounts Production, CT600, Self Assessment, MTD VAT, RTI Payroll, and Practice CRM on one single database.
            </p>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-[#6c5ce7] flex-shrink-0 mt-0.5" />
                <span>{officeAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#6c5ce7] flex-shrink-0" />
                <span>{contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#6c5ce7] flex-shrink-0" />
                <span>{contactEmail}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-slate-500 space-y-0.5 pt-2">
              <p>Registered in England & Wales: #{companyReg}</p>
              <p>UK VAT Registration: {vatNumber}</p>
            </div>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Solutions & Modules
            </h4>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li><Link href="/solutions/practice-management" className="hover:text-purple-600 dark:hover:text-white transition-colors">Practice Management</Link></li>
              <li><Link href="/solutions/accounts-production" className="hover:text-purple-600 dark:hover:text-white transition-colors">Accounts Production FRS</Link></li>
              <li><Link href="/solutions/bookkeeping" className="hover:text-purple-600 dark:hover:text-white transition-colors">Bookkeeping & MTD VAT</Link></li>
              <li><Link href="/solutions/corporation-tax" className="hover:text-purple-600 dark:hover:text-white transition-colors">Corporation Tax CT600</Link></li>
              <li><Link href="/solutions/self-assessment" className="hover:text-purple-600 dark:hover:text-white transition-colors">Self Assessment SA100</Link></li>
              <li><Link href="/solutions/payroll" className="hover:text-purple-600 dark:hover:text-white transition-colors">Payroll & RTI Submissions</Link></li>
              <li><Link href="/solutions/company-secretarial" className="hover:text-purple-600 dark:hover:text-white transition-colors">Company Secretarial (CoSec)</Link></li>
              <li><Link href="/solutions/mtd-it" className="hover:text-purple-600 dark:hover:text-white transition-colors">Making Tax Digital for IT</Link></li>
              <li><Link href="/solutions/capisign" className="hover:text-purple-600 dark:hover:text-white transition-colors">SanSuite Sign (Unlimited eSign)</Link></li>
              <li><Link href="/solutions/client-portal-365" className="hover:text-purple-600 dark:hover:text-white transition-colors">Client Portal 365 Hub</Link></li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Platform & Practice
            </h4>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li><Link href="/#why-sansuite" className="hover:text-purple-600 dark:hover:text-white transition-colors">Why SanSuite</Link></li>
              <li><Link href="/pricing" className="hover:text-purple-600 dark:hover:text-white transition-colors">Transparent Pricing</Link></li>
              <li><Link href="/book-demo" className="hover:text-purple-600 dark:hover:text-white transition-colors">Book Free 1-on-1 Demo</Link></li>
              <li><Link href="/login" className="hover:text-purple-600 dark:hover:text-white transition-colors">Client Portal Sign In</Link></li>
              <li><span className="text-slate-400 dark:text-slate-500">Unlimited Users Model</span></li>
              <li><span className="text-slate-400 dark:text-slate-500">Free Practice Migration</span></li>
              <li><span className="text-slate-400 dark:text-slate-500">Bank-Grade Encryption</span></li>
            </ul>
          </div>

          {/* Column 4: Compliance & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Compliance & Support
            </h4>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li><span className="text-slate-800 dark:text-slate-300 font-semibold">UK Support Hours:</span></li>
              <li className="text-[11px] text-slate-500">Mon – Fri: 8:30 AM – 6:00 PM</li>
              <li className="text-[11px] text-slate-500">Saturday: 9:00 AM – 1:00 PM</li>
              <li className="pt-2"><Link href="/contact" className="hover:text-purple-600 dark:hover:text-white transition-colors">Contact Support Desk</Link></li>
              <li><Link href="/solutions/mtd-it" className="hover:text-purple-600 dark:hover:text-white transition-colors">HMRC MTD Roadmap</Link></li>
              <li><span className="text-slate-400 dark:text-slate-500">Companies House API Direct</span></li>
              <li><span className="text-slate-400 dark:text-slate-500">ISO 27001 Certified Host</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="border-t border-slate-200 dark:border-slate-900 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} SanSuite UK Ltd. All rights reserved. Built natively for UK Chartered Accountants & Tax Professionals.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Privacy Notice</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Security & GDPR</span>
            <span className="hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
