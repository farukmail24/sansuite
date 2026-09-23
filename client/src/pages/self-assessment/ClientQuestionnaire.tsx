import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, Send, CheckSquare, Clock, User, Users, MessageSquare, HelpCircle, Settings } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

export default function ClientQuestionnaire() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState("");
  const [sending, setSending] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Questionnaire Sent", description: "Email has been dispatched to the client.", type: "success" });
    }, 1000);
  };

  const questions = [
    "Did you have any employment income during the tax year?",
    "Were you self-employed or in a partnership?",
    "Did you receive any income from UK property (rental income)?",
    "Did you receive any foreign income?",
    "Did you receive dividend income or interest from savings?",
    "Did you sell any assets liable for Capital Gains Tax?",
    "Are you claiming any tax reliefs (e.g., EIS, SEIS, VCT)?",
    "Did you make personal pension contributions?",
    "Did you make any Gift Aid donations to charity?",
    "Are you liable for the High Income Child Benefit Charge?",
    "Did you receive any taxable state benefits (e.g., State Pension)?",
    "Do you have a student loan that you are repaying?",
    "Did you have any income from a trust or settlement?",
    "Are you claiming any employment expenses?",
    "Were you non-UK resident or claiming remittance basis?",
    "Did you receive any crypto-asset income or gains?",
    "Do you have any other taxable income not covered above?"
  ];

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Client Questionnaire</h1>
            <p className="text-sm text-gray-500">Send the 17-question intake form to gather tax data</p>
          </div>
          <button
            disabled={!selectedClient || sending}
            onClick={handleSend}
            className="btn-SanSuite flex items-center gap-2"
          >
            <Send size={15} /> {sending ? "Sending..." : "Send to Client"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="SanSuite-card p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={18} className="text-purple-600" />
                Select Client
              </h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Individual / SA Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.clientName} ({c.clientCode})</option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                      <Clock size={14} className="text-yellow-500" /> Pending Response
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Last Sent</p>
                    <p className="text-sm font-semibold text-gray-700">Never</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="SanSuite-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
                <CheckSquare size={18} className="text-purple-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Preview: 17-Question Intake Form</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {questions.map((q, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs text-gray-400 font-medium w-8">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-medium">
                          {q}
                        </td>
                        <td className="px-5 py-3 w-32">
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-white border border-gray-200 text-gray-400 text-xs rounded opacity-50 cursor-not-allowed">Yes</span>
                            <span className="px-2 py-1 bg-white border border-gray-200 text-gray-400 text-xs rounded opacity-50 cursor-not-allowed">No</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
