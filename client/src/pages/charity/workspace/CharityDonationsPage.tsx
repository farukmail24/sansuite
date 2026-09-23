import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  HandHeart, Plus, TrendingUp, Calendar, CheckCircle2,
  AlertCircle, ShieldCheck, FileCheck, X, RefreshCw,
  Gift, HeartHandshake, FileText, Send
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export default function CharityDonationsPage() {
  return (
    <CharityWorkspaceLayout activeTab="donations">
      <CharityDonationsContent />
    </CharityWorkspaceLayout>
  );
}

function CharityDonationsContent() {
  const { charityId } = useCharityWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<"donations" | "recurring" | "in-kind" | "gift-aid">("donations");

  // Modals
  const [showAddDonationModal, setShowAddDonationModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showInKindModal, setShowInKindModal] = useState(false);

  // New Donation State
  const [donorName, setDonorName] = useState("");
  const [donationFundId, setDonationFundId] = useState("");
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split("T")[0]);
  const [donationAmount, setDonationAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [isGiftAidEligible, setIsGiftAidEligible] = useState(true);
  const [donationNotes, setDonationNotes] = useState("");

  // Recurring Donation State
  const [recDonorName, setRecDonorName] = useState("");
  const [recFundId, setRecFundId] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recFrequency, setRecFrequency] = useState("Monthly");
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Donation In Kind State
  const [inkDonorName, setInkDonorName] = useState("");
  const [inkDate, setInkDate] = useState(new Date().toISOString().split("T")[0]);
  const [inkType, setInkType] = useState("Goods");
  const [inkFundId, setInkFundId] = useState("");
  const [inkValue, setInkValue] = useState("");
  const [inkNotes, setInkNotes] = useState("");

  // Fetch Funds for dropdowns
  const { data: fundsData } = useQuery({
    queryKey: [`/api/charity/${charityId}/funds`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/funds`);
      if (!res.ok) return { funds: [] };
      return res.json();
    },
    enabled: !!charityId,
  });
  const funds = fundsData?.funds || [];

  // Fetch Donations
  const { data: donationsData, isLoading: isLoadingDonations } = useQuery({
    queryKey: [`/api/charity/${charityId}/donations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/donations`);
      if (!res.ok) throw new Error("Failed to fetch donations");
      return res.json();
    },
    enabled: !!charityId,
  });

  // Fetch Recurring
  const { data: recurringList = [], isLoading: isLoadingRecurring } = useQuery({
    queryKey: [`/api/charity/${charityId}/recurring-donations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/recurring-donations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId && activeSubTab === "recurring",
  });

  // Fetch Donations in Kind
  const { data: inKindList = [], isLoading: isLoadingInKind } = useQuery({
    queryKey: [`/api/charity/${charityId}/donations-in-kind`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/donations-in-kind`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!charityId && activeSubTab === "in-kind",
  });

  // Fetch Gift Aid Claims
  const { data: giftAidData, isLoading: isLoadingGiftAid, refetch: refetchGiftAid } = useQuery({
    queryKey: [`/api/charity/${charityId}/gift-aid-claims`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/charity/${charityId}/gift-aid-claims`);
      if (!res.ok) throw new Error("Failed to fetch gift aid");
      return res.json();
    },
    enabled: !!charityId && activeSubTab === "gift-aid",
  });

  const donations = donationsData?.donations || [];
  const donationSummary = donationsData?.summary || {
    totalDonations: "0.00",
    totalCount: 0,
    eligibleCount: 0,
    potentialGiftAid: "0.00",
  };

  // Add Donation Mutation
  const addDonationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/donations`, {
        donorName,
        fundId: donationFundId,
        donationDate,
        amount: donationAmount,
        paymentMethod,
        isGiftAidEligible,
        notes: donationNotes,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to record donation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Donation Recorded", description: `£${donationAmount} donation from ${donorName} saved.` });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/donations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/funds`] });
      setShowAddDonationModal(false);
      setDonorName("");
      setDonationAmount("");
      setDonationNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add Recurring Mutation
  const addRecurringMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/recurring-donations`, {
        donorName: recDonorName,
        fundId: recFundId,
        amount: recAmount,
        frequency: recFrequency,
        startDate: recStartDate,
      });
      if (!res.ok) throw new Error("Failed to schedule recurring donation");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Recurring Donation Scheduled", description: "Schedule added successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/recurring-donations`] });
      setShowRecurringModal(false);
      setRecDonorName("");
      setRecAmount("");
    },
  });

  // Add In Kind Mutation
  const addInKindMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/donations-in-kind`, {
        donorName: inkDonorName,
        donationDate: inkDate,
        donationType: inkType,
        fundId: inkFundId,
        estimatedValue: inkValue,
        notes: inkNotes,
      });
      if (!res.ok) throw new Error("Failed to record donation in kind");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Donation in Kind Recorded", description: "Goods/services logged successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/donations-in-kind`] });
      setShowInKindModal(false);
      setInkDonorName("");
      setInkValue("");
      setInkNotes("");
    },
  });

  // Submit Gift Aid Claim Mutation
  const submitClaimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/charity/${charityId}/gift-aid-claims`, {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit claim");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Gift Aid Claim Submitted",
        description: `Reference ${data.claimReference}: Repayment of £${data.giftAidAmount} prepared for HMRC.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/gift-aid-claims`] });
      queryClient.invalidateQueries({ queryKey: [`/api/charity/${charityId}/donations`] });
    },
    onError: (err: any) => {
      toast({ title: "Claim Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Charity Donations & Gift Aid</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record regular donations, recurring giving, gifts in kind, and file statutory HMRC Gift Aid claims.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === "donations" && (
            <button
              onClick={() => setShowAddDonationModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>Record Donation</span>
            </button>
          )}
          {activeSubTab === "recurring" && (
            <button
              onClick={() => setShowRecurringModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>New Recurring Donation</span>
            </button>
          )}
          {activeSubTab === "in-kind" && (
            <button
              onClick={() => setShowInKindModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              <span>Add In-Kind Donation</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {[
          { id: "donations", label: "Donations Register", icon: <HandHeart size={14} /> },
          { id: "recurring", label: "Recurring Donations", icon: <RefreshCw size={14} /> },
          { id: "in-kind", label: "Donations in Kind", icon: <Gift size={14} /> },
          { id: "gift-aid", label: "HMRC Gift Aid Claims (25%)", icon: <ShieldCheck size={14} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeSubTab === t.id
                ? "border-orange-600 text-orange-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: DONATIONS REGISTER */}
      {activeSubTab === "donations" && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Giving Received</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                £{parseFloat(donationSummary.totalDonations).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">{donationSummary.totalCount} individual gifts recorded</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gift Aid Eligible Gifts</span>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {donationSummary.eligibleCount} Gifts
              </div>
              <p className="text-xs text-slate-500 mt-1">Backed by donor Gift Aid declarations</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Tax Uplift Claimable (25%)</span>
              <div className="text-xl font-bold text-blue-700 mt-1">
                £{parseFloat(donationSummary.potentialGiftAid).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-blue-600 mt-1">Ready for HMRC submission schedule</p>
            </div>
          </div>

          {/* Donations Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Donor Name</th>
                    <th className="px-4 py-3">Allocated Fund</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Gift Aid</th>
                    <th className="px-4 py-3 text-right">Amount (£)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingDonations ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading donations...</td></tr>
                  ) : donations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <HandHeart size={32} className="mx-auto text-slate-300 mb-2" />
                        No donations recorded yet. Click "Record Donation" to add your first gift.
                      </td>
                    </tr>
                  ) : (
                    donations.map((d: any) => (
                      <tr key={d.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600">{d.donationDate}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div>{d.donorName}</div>
                          {d.notes && <div className="text-[11px] font-normal text-slate-400">{d.notes}</div>}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-600">{d.fundName}</td>
                        <td className="px-4 py-3 text-slate-500">{d.paymentMethod}</td>
                        <td className="px-4 py-3">
                          {d.isGiftAidEligible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={10} /> +£{d.giftAidAmount} (25%)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-sm">
                          £{parseFloat(d.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RECURRING DONATIONS */}
      {activeSubTab === "recurring" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Active Recurring Pledges & Direct Debits</h3>
            <span className="text-xs text-slate-500 font-mono">{recurringList.length} Active Schedules</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="px-4 py-3">Donor Name</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Next Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Pledged Amount (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingRecurring ? (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading recurring schedules...</td></tr>
                ) : recurringList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recurring donations scheduled. Click "New Recurring Donation" to set up regular giving.
                    </td>
                  </tr>
                ) : (
                  recurringList.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.donorName}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{r.frequency}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.startDate}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 font-medium">{r.nextDueDate || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        £{parseFloat(r.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DONATIONS IN KIND */}
      {activeSubTab === "in-kind" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Donations in Kind (Goods, Services, Facilities)</h3>
            <span className="text-xs text-slate-500 font-mono">{inKindList.length} Items Logged</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donor / Provider</th>
                  <th className="px-4 py-3">Donation Type</th>
                  <th className="px-4 py-3">Debit / Credit Accounts</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Estimated Fair Value (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingInKind ? (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading donations in kind...</td></tr>
                ) : inKindList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No gifts in kind recorded yet. Click "Add In-Kind Donation" to record donated goods or services.
                    </td>
                  </tr>
                ) : (
                  inKindList.map((k: any) => (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600">{k.donationDate}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{k.donorName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-700">
                          {k.donationType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        Dr: {k.debitNominalCode || "7000"} / Cr: {k.creditNominalCode || "4040"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{k.notes || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        £{parseFloat(k.estimatedValue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: GIFT AID CLAIMS (25%) */}
      {activeSubTab === "gift-aid" && (
        <div className="space-y-6">
          {/* Unclaimed Repayment Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                HMRC Charities Repayment
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Unsubmitted Eligible Gift Aid: £{parseFloat(giftAidData?.unclaimed?.claimableGiftAid || "0").toFixed(2)}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Calculated on {giftAidData?.unclaimed?.count || 0} eligible donation(s) totaling £
                {parseFloat(giftAidData?.unclaimed?.totalAmount || "0").toFixed(2)}.
              </p>
            </div>
            <button
              onClick={() => submitClaimMutation.mutate()}
              disabled={submitClaimMutation.isPending || !giftAidData?.unclaimed?.count}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Send size={14} />
              <span>{submitClaimMutation.isPending ? "Submitting Claim..." : "Compile & Submit Claim Schedule"}</span>
            </button>
          </div>

          {/* Historical Claims Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">HMRC Gift Aid Claims Schedule</h3>
              <span className="text-xs text-slate-500 font-mono">{giftAidData?.claims?.length || 0} Claims Filed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="px-4 py-3">Claim Reference</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Total Donations</th>
                    <th className="px-4 py-3 text-right">25% Repayment Reclaimed (£)</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingGiftAid ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading claims...</td></tr>
                  ) : (giftAidData?.claims || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No Gift Aid claims filed yet. Click "Compile & Submit Claim Schedule" to file your first claim.
                      </td>
                    </tr>
                  ) : (
                    (giftAidData?.claims || []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.claimReference}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{c.claimStartDate} to {c.claimEndDate}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">£{parseFloat(c.totalDonations).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 text-sm">
                          £{parseFloat(c.giftAidAmount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-800">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Donation */}
      {showAddDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Record Charitable Donation</h3>
              <button onClick={() => setShowAddDonationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Donor Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Eleanor Vance"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Donation Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Donation Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allocated Fund</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={donationFundId}
                    onChange={(e) => setDonationFundId(e.target.value)}
                  >
                    <option value="">General Fund</option>
                    {funds.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.fundName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Direct Debit">Direct Debit</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <input
                  type="checkbox"
                  id="ga-check"
                  checked={isGiftAidEligible}
                  onChange={(e) => setIsGiftAidEligible(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="ga-check" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Donor made Gift Aid Declaration (Claim +25% from HMRC)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Campaign</label>
                <input
                  type="text"
                  placeholder="Optional reference or event details"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={donationNotes}
                  onChange={(e) => setDonationNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDonationModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addDonationMutation.isPending}
                  onClick={() => addDonationMutation.mutate()}
                  className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addDonationMutation.isPending ? "Recording..." : "Save Donation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recurring Donation */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Schedule Recurring Donation</h3>
              <button onClick={() => setShowRecurringModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Donor Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={recDonorName}
                  onChange={(e) => setRecDonorName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency *</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={recStartDate}
                    onChange={(e) => setRecStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fund</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={recFundId}
                    onChange={(e) => setRecFundId(e.target.value)}
                  >
                    <option value="">General Fund</option>
                    {funds.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.fundName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addRecurringMutation.isPending}
                  onClick={() => addRecurringMutation.mutate()}
                  className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addRecurringMutation.isPending ? "Scheduling..." : "Save Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Donation in Kind */}
      {showInKindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">Record Donation in Kind</h3>
              <button onClick={() => setShowInKindModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Donor / Provider *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Logistics Ltd"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={inkDonorName}
                  onChange={(e) => setInkDonorName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                    value={inkType}
                    onChange={(e) => setInkType(e.target.value)}
                  >
                    <option value="Goods">Goods</option>
                    <option value="Services">Professional Services</option>
                    <option value="Facilities">Free Facilities / Venue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Value (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                    value={inkValue}
                    onChange={(e) => setInkValue(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Provide valuation details and goods specification..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  value={inkNotes}
                  onChange={(e) => setInkNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInKindModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addInKindMutation.isPending}
                  onClick={() => addInKindMutation.mutate()}
                  className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {addInKindMutation.isPending ? "Logging..." : "Save In-Kind Gift"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
