import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Send,
  Building2,
  Headphones,
  FileCheck2,
  HelpCircle,
  AlertCircle
} from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    workEmail: "",
    phoneNumber: "",
    practiceName: "",
    subject: "sales",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/public/cms/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          workEmail: form.workEmail,
          phoneNumber: form.phoneNumber,
          practiceName: form.practiceName,
          inquiryType: "contact",
          message: `[Subject: ${form.subject}] ${form.message}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to send your message. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "A network error occurred. Please contact us directly at support@sansuite.co.uk");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-purple-50/70 via-white to-slate-50 dark:from-purple-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-6">
            <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>UK Practice Support & Sales</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5">
            We’re here to help your practice{" "}
            <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-emerald-600 dark:from-purple-400 dark:via-purple-300 dark:to-emerald-400 bg-clip-text text-transparent">
              succeed and scale
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Have questions about migrating from your legacy provider, statutory MTD compliance, or bespoke multi-office licensing? Connect directly with our London-based accounting technology team.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Details & Info (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Get in touch directly</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Our support team is comprised of certified UK accountants and system specialists who understand HMRC filing, CT600 computation, and practice workflows.
              </p>
            </div>

            <div className="space-y-4">
              {/* Telephone */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Telephone Support & Sales</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct lines to our UK operations desk</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-300">+44 (0) 20 7946 0982 <span className="text-xs text-slate-500">(Sales & Onboarding)</span></p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">+44 (0) 20 7946 0983 <span className="text-xs text-slate-500">(Technical & HMRC Desk)</span></p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Email Communications</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rapid turnaround within 2 working hours</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="text-slate-500 text-xs">General:</span> <a href="mailto:contact@sansuite.co.uk" className="text-purple-600 dark:text-purple-300 hover:underline">contact@sansuite.co.uk</a></p>
                    <p><span className="text-slate-500 text-xs">Support:</span> <a href="mailto:support@sansuite.co.uk" className="text-purple-600 dark:text-purple-300 hover:underline">support@sansuite.co.uk</a></p>
                    <p><span className="text-slate-500 text-xs">Sales:</span> <a href="mailto:sales@sansuite.co.uk" className="text-purple-600 dark:text-purple-300 hover:underline">sales@sansuite.co.uk</a></p>
                  </div>
                </div>
              </div>

              {/* Physical Office */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">London Headquarters</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Corporate & Development Center</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                    One Canada Square, 38th Floor<br />
                    Canary Wharf, London, E14 5AA<br />
                    United Kingdom
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm transition-colors">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">UK Operational Hours</h3>
                  <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Monday – Friday:</strong> 08:30 – 18:00 GMT</p>
                    <p><strong className="text-slate-900 dark:text-white">Saturday:</strong> 09:00 – 13:00 GMT <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(January & March Filing Support)</span></p>
                    <p><strong className="text-slate-900 dark:text-white">Sunday & Bank Holidays:</strong> Closed (Emergency system monitor active)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accreditation Badges */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ISO 27001 Certified
              </span>
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-purple-600" />
                HMRC Recognized
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                ICAEW & ACCA Ready
              </span>
            </div>
          </div>

          {/* Contact / Inquiry Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/90 shadow-xl relative">
              {submitted ? (
                <div className="py-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Message Dispatched Successfully</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-md mx-auto">
                      Thank you for reaching out to SanSuite. A dedicated account specialist will review your inquiry and respond to <span className="text-slate-900 dark:text-white font-medium">{form.workEmail}</span> within 2 business hours.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Practice Name:</span>
                      <span className="text-slate-800 dark:text-slate-300 font-medium">{form.practiceName || "Independent"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inquiry Subject:</span>
                      <span className="text-purple-600 dark:text-purple-300 font-medium uppercase">{form.subject}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        fullName: "",
                        workEmail: "",
                        phoneNumber: "",
                        practiceName: "",
                        subject: "sales",
                        message: "",
                      });
                    }}
                    className="px-6 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Us a Message</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Fill out the form below and our team will get back to you promptly.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Your Full Name <span className="text-purple-600 dark:text-purple-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="e.g. Eleanor Vance"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Work Email Address <span className="text-purple-600 dark:text-purple-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.workEmail}
                        onChange={(e) => setForm({ ...form, workEmail: e.target.value })}
                        placeholder="e.g. eleanor@vanceassociates.co.uk"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Telephone Number
                      </label>
                      <input
                        type="tel"
                        value={form.phoneNumber}
                        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                        placeholder="e.g. +44 20 7946 0123"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Accounting Practice / Firm Name
                      </label>
                      <input
                        type="text"
                        value={form.practiceName}
                        onChange={(e) => setForm({ ...form, practiceName: e.target.value })}
                        placeholder="e.g. Vance & Partners Chartered Accountants"
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nature of Inquiry
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    >
                      <option value="sales">New Practice License & Modular Pricing</option>
                      <option value="demo">Request Tailored Workflow Demo</option>
                      <option value="migration">Data Migration from Iris / Sage / Capium</option>
                      <option value="technical">Technical Support & HMRC Submission Query</option>
                      <option value="partnership">Partner or API Integration Program</option>
                      <option value="other">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      How can we assist you? <span className="text-purple-600 dark:text-purple-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please describe your practice requirements, questions, or current software challenges..."
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-y"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Transmitting Inquiry...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Message to UK Support Desk</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Your information is handled strictly under UK GDPR & Data Protection Act 2018.</span>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
