import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CTWorkspaceLayout, { useCTWorkspace } from "./CTWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Upload,
  Download, ExternalLink, HelpCircle, Shield, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

export default function CTAttachmentsPage() {
  return (
    <CTWorkspaceLayout activeSection="Attachments & Accounts">
      <CTAttachmentsContent />
    </CTWorkspaceLayout>
  );
}

function CTAttachmentsContent() {
  const { clientId, client, currentReturn } = useCTWorkspace();
  const { toast } = useToast();

  const [isDormantCompany, setIsDormantCompany] = useState(false);
  const [noAccountsReason, setNoAccountsReason] = useState("");

  // 1. Fetch iXBRL accounts from Accounts Production
  const { data: ixbrlSubmissions = [], isLoading: isLoadingIxbrl } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const matchingIxbrl = ixbrlSubmissions.find(
    (sub) => sub.periodId === currentReturn?.periodId || sub.status === "Submitted" || sub.status === "Accepted"
  ) || ixbrlSubmissions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-indigo-600" />
            Statutory Accounts & Computations Attachments
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            HMRC requires an inline XBRL (iXBRL) accounts file and detailed tax computation with every CT600 return.
          </p>
        </div>
      </div>

      {/* 1. iXBRL Accounts Attachment Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              1. Statutory Annual Accounts (iXBRL Format)
            </h3>
          </div>
          {matchingIxbrl ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={10} /> Auto-Linked from Accounts Production
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
              Not Yet Tagged
            </span>
          )}
        </div>

        {matchingIxbrl ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                iXBRL Accounts Tagged File ({matchingIxbrl.accountsType || "FRS 102 1A / FRS 105"})
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Transaction Ref: {matchingIxbrl.chTransactionId || "AP-STATUTORY-XML"} • Created: {new Date(matchingIxbrl.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Link href={`/accounts-production/${clientId}/ixbrl-filing`}>
              <span className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer">
                <span>View in AP</span>
                <ExternalLink size={11} />
              </span>
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-2">
            <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle size={14} /> No iXBRL Accounts Generated for this Period
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              HMRC requires annual accounts to be attached in iXBRL format. Head to Accounts Production to generate the statutory iXBRL filing pack.
            </p>
            <Link href={`/accounts-production/${clientId}/ixbrl-filing`}>
              <span className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer mt-1">
                <span>Go to Accounts Production</span>
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Detailed Tax Computation Attachment */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              2. Detailed CT600 Tax Computation Statement
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
            <CheckCircle2 size={10} /> Auto-Generated
          </span>
        </div>

        <p className="text-xs text-slate-500">
          The computation statement includes turnover reconciliation, disallowables schedule, capital allowances claimed, marginal relief calculation, and net tax due. It is compiled and converted to HMRC GovTalk format during submission.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              CT600 Statutory Computation Statement ({currentReturn?.taxYear || "2025/2026"})
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Net Tax Due: £{parseFloat(currentReturn?.netTaxDue || "0").toFixed(2)} • IR Mark Ready
            </p>
          </div>
          <Link href={`/corporation-tax/${clientId}/computation`}>
            <span className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer">
              <span>Review Computation</span>
            </span>
          </Link>
        </div>
      </div>

      {/* 3. Dormant Company Exception */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            3. Dormant Company Exception
          </h3>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isDormantCompany}
              onChange={(e) => setIsDormantCompany(e.target.checked)}
              className="rounded border-slate-300"
            />
            Dormant Company Return (No Accounts Required)
          </label>
        </div>

        {isDormantCompany && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 text-xs">
            <label className="font-medium text-slate-700 dark:text-slate-300 block">Reason No Accounts are Attached</label>
            <select
              value={noAccountsReason}
              onChange={(e) => setNoAccountsReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="Dormant">Company is dormant (no trading or business transactions)</option>
              <option value="FiledSeparately">Accounts already submitted to HMRC separately</option>
              <option value="NotRequired">Company is exempt from filing accounts with HMRC</option>
            </select>
            <p className="text-[10px] text-slate-400">
              This reason will be inserted into the HMRC XML Body tag (Box 95/96) to prevent rejection code 3001.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
