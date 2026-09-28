import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { CheckCircle2, ShieldCheck, Calendar, Clock, Users, ArrowRight, Building2, Sparkles } from "lucide-react";

export default function BookDemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    workEmail: "",
    phoneNumber: "",
    practiceName: "",
    clientCountBracket: "50 - 150",
    interestedModules: [
      "Practice Management",
      "Accounts Production",
      "Corporation Tax CT600",
      "MTD for Income Tax",
    ],
    message: "",
  });

  const availableModules = [
    "Practice Management",
    "Accounts Production (FRS 102/105)",
    "Bookkeeping & MTD VAT",
    "Corporation Tax (CT600)",
    "Self Assessment (SA100)",
    "Payroll & RTI Pensions",
    "Company Secretarial",
    "MTD for Income Tax (MTD IT)",
    "Unlimited SanSuite eSign",
    "Client Portal 365 Hub",
  ];

  const toggleModule = (mod: string) => {
    if (form.interestedModules.includes(mod)) {
      setForm({ ...form, interestedModules: form.interestedModules.filter((m) => m !== mod) });
    } else {
      setForm({ ...form, interestedModules: [...form.interestedModules, mod] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/public/cms/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          inquiryType: "book_demo",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit demo request.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while booking your demo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
      <Navbar />

      <main className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Why Book a Demo */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                <Calendar size={14} className="text-[#6c5ce7]" />
                <span>1-on-1 Practice Walkthrough</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Experience SanSuite Tailored to Your Firm
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Join a 30-minute private consultation with a UK practice software specialist. We will demonstrate how SanSuite streamlines your practice CRM, automated deadlines, accounts production, and tax filings in one unified database.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={16} className="text-[#6c5ce7]" /> 30-Minute Focused Session
                </span>
                <p className="text-slate-500 dark:text-slate-400">Zero pressure walkthrough focusing specifically on the modules your firm requires.</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-500" /> Free Data Migration Roadmap
                </span>
                <p className="text-slate-500 dark:text-slate-400">Discuss how we migrate your existing client records, trial balances, and payroll data free of charge.</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-purple-600 dark:text-purple-400" /> Unlimited Users Evaluation
                </span>
                <p className="text-slate-500 dark:text-slate-400">Invite your partners and senior accountants to test the system together.</p>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl text-xs text-purple-900 dark:text-purple-300 space-y-1">
              <span className="font-bold block">Prefer to speak over the phone immediately?</span>
              <p className="text-slate-600 dark:text-slate-400">Call our London office directly at <strong className="text-slate-900 dark:text-white">+44 (0) 20 7946 0982</strong> (Mon–Fri 8:30am – 6:00pm).</p>
            </div>
          </div>

          {/* Right Column: Interactive Booking Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl backdrop-blur-xl">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Demo Request Received</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{form.fullName}</strong>. A dedicated UK senior practice consultant has been assigned to your firm and will reach out to <strong>{form.workEmail}</strong> shortly to confirm your demo time.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        fullName: "",
                        workEmail: "",
                        phoneNumber: "",
                        practiceName: "",
                        clientCountBracket: "50 - 150",
                        interestedModules: [],
                        message: "",
                      });
                    }}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request a 1-on-1 Practice Demo</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Please provide your details so we can tailor the software demonstration.</p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Harrington"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="david@harrington-accountants.co.uk"
                      value={form.workEmail}
                      onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">UK Telephone Number</label>
                    <input
                      type="tel"
                      placeholder="+44 7700 900123"
                      value={form.phoneNumber}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Practice / Firm Name</label>
                    <input
                      type="text"
                      placeholder="Harrington & Co Accountants"
                      value={form.practiceName}
                      onChange={(e) => setForm({ ...form, practiceName: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Approximate Active Clients</label>
                  <select
                    value={form.clientCountBracket}
                    onChange={(e) => setForm({ ...form, clientCountBracket: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                  >
                    <option value="Under 50">Under 50 Active Clients</option>
                    <option value="50 - 150">50 - 150 Active Clients</option>
                    <option value="150 - 300">150 - 300 Active Clients</option>
                    <option value="300 - 500">300 - 500 Active Clients</option>
                    <option value="500+">500+ Enterprise Bureau Clients</option>
                  </select>
                </div>

                {/* Primary Modules of Interest Checkbox Grid */}
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Primary Modules You Would Like to See:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {availableModules.map((mod) => {
                      const isSelected = form.interestedModules.includes(mod);
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => toggleModule(mod)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                            isSelected
                              ? "bg-purple-50 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-200"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "bg-[#6c5ce7] border-[#6c5ce7] text-white"
                                : "border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {isSelected && <CheckCircle2 size={12} />}
                          </div>
                          <span className="truncate">{mod}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Specific Practice Requirements or Current Software (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Currently using desktop accounts software and looking to migrate 120 clients before the next MTD deadline..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:border-[#6c5ce7] focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#6c5ce7] via-indigo-600 to-[#5b4bc4] hover:from-[#5b4bc4] hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? "Processing Request..." : "Confirm 1-on-1 Practice Demo"}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
