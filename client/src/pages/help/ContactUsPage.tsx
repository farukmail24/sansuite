import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function ContactUsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ticketMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/support/tickets", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Inquiry Sent", description: "Your support ticket has been created successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message || "Failed to send contact inquiry", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    ticketMutation.mutate({
      subject: `[Contact Form] ${subject}`,
      category,
      priority: "normal",
      message: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
  };

  return (
    <AppLayout module="Help & Contact Us">
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Contact SanSuite Support</h1>
            <p className="text-sm text-gray-500">
              Have a question or need assistance with your practice management, HMRC filing, or billing? Our expert support team is here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Contact Details Cards */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Email Support</h3>
                  <p className="text-xs text-gray-500 mt-0.5">support@sansuite.com</p>
                  <p className="text-[11px] text-gray-400 mt-1">24/7 Ticketing Response</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Phone Support</h3>
                  <p className="text-xs text-gray-500 mt-0.5">+44 (0) 20 7946 0912</p>
                  <p className="text-[11px] text-gray-400 mt-1">Mon - Fri, 9am - 5pm GMT</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">SLA Guarantee</h3>
                  <p className="text-xs text-gray-500 mt-0.5">&lt; 2 Hours Average Response</p>
                  <p className="text-[11px] text-gray-400 mt-1">Priority handling for HMRC filings</p>
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Thank You! Message Received</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Your inquiry has been logged as a support ticket. A specialist will review your request and reply to your email shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Send Us a Direct Message</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@firm.com"
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Inquiry Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="technical">Technical / System Issue</option>
                        <option value="billing">Billing & Subscription</option>
                        <option value="feature_request">HMRC / MTD Assistance</option>
                        <option value="other">General Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of inquiry"
                        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Message Details</label>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your question or issue in detail..."
                      className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketMutation.isPending}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send size={16} /> {ticketMutation.isPending ? "Sending Inquiry..." : "Submit Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
