import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  Shield, Building2, FilePlus, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Search, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, Send, Info
} from "lucide-react";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Action Station", icon: <Shield size={15} />, route: "/company-secretarial" },
  { label: "Companies", icon: <Building2 size={15} />, route: "/company-secretarial?tab=companies" },
  { label: "Formations", icon: <FilePlus size={15} />, route: "/company-secretarial?tab=formations" },
];

export default function FormationWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Name & Type
  const [companyDetails, setCompanyDetails] = useState({
    companyName: "",
    companyType: "Limited",
    registeredAddress: "",
    registeredEmail: "",
    country: "United Kingdom",
    sicCode: "62020",
    articlesOfAssociation: "Model Articles"
  });

  // Name validation state
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [nameValidationResult, setNameValidationResult] = useState<any>(null);

  // Step 2: Officers
  const [officers, setOfficers] = useState<any[]>([
    {
      name: "",
      role: "Director",
      nationality: "British",
      occupation: "Company Director",
      serviceAddress: "",
      residentialAddress: "",
      dateOfBirth: ""
    }
  ]);

  // Step 3: Shareholders
  const [shareholders, setShareholders] = useState<any[]>([
    {
      name: "",
      shareholderType: "Individual",
      shareClass: "Ordinary",
      sharesHeld: "100",
      nominalValue: "1.00",
      email: ""
    }
  ]);

  const addOfficer = () => setOfficers([
    ...officers,
    {
      name: "",
      role: "Director",
      nationality: "British",
      occupation: "Company Director",
      serviceAddress: "",
      residentialAddress: "",
      dateOfBirth: ""
    }
  ]);

  const updateOfficer = (index: number, field: string, value: string) => {
    const updated = [...officers];
    updated[index][field] = value;
    setOfficers(updated);
  };

  const removeOfficer = (index: number) => {
    if (officers.length <= 1) {
      toast({ title: "Minimum Officer", description: "A limited company must have at least one director.", type: "error" });
      return;
    }
    setOfficers(officers.filter((_, i) => i !== index));
  };

  const addShareholder = () => setShareholders([
    ...shareholders,
    {
      name: "",
      shareholderType: "Individual",
      shareClass: "Ordinary",
      sharesHeld: "100",
      nominalValue: "1.00",
      email: ""
    }
  ]);

  const updateShareholder = (index: number, field: string, value: string) => {
    const updated = [...shareholders];
    updated[index][field] = value;
    setShareholders(updated);
  };

  const removeShareholder = (index: number) => {
    if (shareholders.length <= 1) {
      toast({ title: "Minimum Member", description: "A company must have at least one shareholder.", type: "error" });
      return;
    }
    setShareholders(shareholders.filter((_, i) => i !== index));
  };

  // Validate company name against live Companies House & Statutory Restrictions
  const handleValidateName = async () => {
    if (!companyDetails.companyName.trim()) {
      toast({ title: "Company Name Required", description: "Please enter a proposed company name.", type: "error" });
      return;
    }
    setIsValidatingName(true);
    setNameValidationResult(null);
    try {
      const res = await apiRequest("POST", "/api/company-secretarial/validate-name", {
        companyName: companyDetails.companyName.trim()
      });
      const data = await res.json();
      setNameValidationResult(data);
      if (data.valid && data.warnings.length === 0) {
        toast({ title: "Name Available", description: "Company name is compliant with UK Companies Act.", type: "success" });
      }
    } catch (e: any) {
      toast({ title: "Validation Failed", description: e.message, type: "error" });
    } finally {
      setIsValidatingName(false);
    }
  };

  // Submit Formation
  const formationMutation = useMutation({
    mutationFn: async () => {
      if (!companyDetails.companyName.trim()) throw new Error("Company Name is required");
      if (!companyDetails.registeredAddress.trim()) throw new Error("Registered Office Address is required");
      if (!companyDetails.registeredEmail.trim()) {
        throw new Error("UK ECCTA 2024 Requirement: Registered Email Address is mandatory.");
      }
      if (officers.some(o => !o.name.trim())) throw new Error("All officers must have a valid full name.");
      if (shareholders.some(s => !s.name.trim() || !s.sharesHeld)) throw new Error("All shareholders must have a name and number of shares.");

      const payload = {
        ...companyDetails,
        officers,
        shareholders
      };
      const res = await apiRequest("POST", "/api/company-secretarial/formations", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit formation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/filings"] });
      toast({ title: "Formation Submitted", description: "Form IN01 submitted successfully. Company registered in SanSuite.", type: "success" });
      navigate(`/company-secretarial/${data.clientId}`);
    },
    onError: (e: any) => {
      toast({ title: "Submission Failed", description: e.message, type: "error" });
    }
  });

  const totalShares = shareholders.reduce((sum, s) => sum + parseFloat(s.sharesHeld || "0"), 0);

  return (
    <AppLayout sidebar={sidebar} module="Company Secretarial">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Top Breadcrumb */}
        <div className="bg-slate-900 text-slate-300 px-6 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/company-secretarial")} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <span>/</span>
            <button onClick={() => navigate("/company-secretarial?tab=formations")} className="hover:text-white transition-colors cursor-pointer">
              Formations
            </button>
            <span>/</span>
            <span className="font-semibold text-white">Incorporate New Company (IN01)</span>
          </div>
          <button
            onClick={() => navigate("/company-secretarial")}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel Formation &times;
          </button>
        </div>

        <div className="max-w-4xl mx-auto mt-8 px-4">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">UK Company Incorporation (Form IN01)</h1>
            <p className="text-xs text-slate-500 mt-1">
              Statutory incorporation wizard compliant with the Companies Act 2006 and ECCTA 2024.
            </p>
          </div>

          {/* Stepper Header */}
          <div className="flex items-center justify-center mb-8">
            {[
              { num: 1, label: "Company Name" },
              { num: 2, label: "Registered Office" },
              { num: 3, label: "Officers" },
              { num: 4, label: "Share Capital" },
              { num: 5, label: "Review & File" },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-xs ${step === s.num
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : step > s.num
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-500"
                      }`}
                  >
                    {step > s.num ? <Check size={16} /> : s.num}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 mt-1 hidden sm:block">{s.label}</span>
                </div>
                {idx < 4 && (
                  <div className={`h-1 w-12 sm:w-16 mx-2 rounded-full mb-4 ${step > s.num ? "bg-slate-900" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card Form */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8">
            {/* STEP 1: COMPANY NAME & AVAILABILITY */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Step 1: Company Name &amp; Entity Type</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Check name availability against the official Companies House registrar and statutory restriction rules.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Proposed Company Name * (Must end with Ltd, Limited, LLP, or PLC)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={companyDetails.companyName}
                        onChange={(e) => {
                          setCompanyDetails({ ...companyDetails, companyName: e.target.value });
                          setNameValidationResult(null);
                        }}
                        placeholder="e.g. Sterling Capital Partners Ltd"
                        className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleValidateName}
                        disabled={isValidatingName || !companyDetails.companyName.trim()}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isValidatingName ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                        Check Availability
                      </button>
                    </div>
                  </div>

                  {/* Name Validation Feedback Box */}
                  {nameValidationResult && (
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${nameValidationResult.valid
                      ? nameValidationResult.warnings.length > 0
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                      }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {nameValidationResult.valid ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            Name is compliant and available for registration
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-rose-600" />
                            Name cannot be registered
                          </>
                        )}
                      </div>

                      {nameValidationResult.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs text-rose-700 font-medium pl-6">&bull; {err}</p>
                      ))}

                      {nameValidationResult.warnings.map((warn: string, i: number) => (
                        <p key={i} className="text-xs text-amber-700 font-medium pl-6">&bull; {warn}</p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Entity Type</label>
                      <select
                        value={companyDetails.companyType}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, companyType: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="Limited">Private Limited Company (Ltd)</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                        <option value="PLC">Public Limited Company (PLC)</option>
                        <option value="Limited by Guarantee">Limited by Guarantee</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Articles of Association</label>
                      <select
                        value={companyDetails.articlesOfAssociation}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, articlesOfAssociation: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="Model Articles">Model Articles (Standard Statutory)</option>
                        <option value="Bespoke Articles">Bespoke / Tailored Articles</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: REGISTERED OFFICE & EMAIL */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Step 2: Registered Office &amp; Statutory Contacts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official address for Companies House and HMRC notices, plus the mandatory registered email address.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                    <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      <strong>ECCTA 2024 Requirement:</strong> From March 2024, new incorporations must provide an appropriate <strong>Registered Email Address</strong> which Companies House can use to communicate with the company.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Registered Email Address * (Mandatory by Law)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. director@company.co.uk"
                      value={companyDetails.registeredEmail}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, registeredEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Registered Office Address *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Street address, City, County, Postcode (e.g. 100 Pall Mall, London, SW1Y 5NQ)"
                      value={companyDetails.registeredAddress}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, registeredAddress: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Country *</label>
                      <input
                        type="text"
                        value={companyDetails.country}
                        readOnly
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SIC Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. 62020 - IT Consultancy"
                        value={companyDetails.sicCode}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, sicCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: OFFICERS */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Step 3: Company Officers</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      At least one director must be appointed on incorporation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addOfficer}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Another Officer
                  </button>
                </div>

                <div className="space-y-4">
                  {officers.map((officer, index) => (
                    <div key={index} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative">
                      {officers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOfficer(index)}
                          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name *</label>
                          <input
                            type="text"
                            placeholder="First name and surname"
                            value={officer.name}
                            onChange={(e) => updateOfficer(index, "name", e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
                          <select
                            value={officer.role}
                            onChange={(e) => updateOfficer(index, "role", e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                          >
                            <option value="Director">Director</option>
                            <option value="Secretary">Secretary</option>
                            <option value="LLP Member">LLP Member</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={officer.dateOfBirth}
                            onChange={(e) => updateOfficer(index, "dateOfBirth", e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nationality</label>
                          <input
                            type="text"
                            value={officer.nationality}
                            onChange={(e) => updateOfficer(index, "nationality", e.target.value)}
                            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: SHAREHOLDERS & SHARE CAPITAL */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Step 4: Shareholders &amp; Statement of Capital</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shareholders holding &gt; 25% are automatically identified as PSCs under UK law.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addShareholder}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Shareholder
                  </button>
                </div>

                <div className="space-y-4">
                  {shareholders.map((shareholder, index) => {
                    const sharesNum = parseFloat(shareholder.sharesHeld || "0");
                    const pct = totalShares > 0 ? ((sharesNum / totalShares) * 100).toFixed(2) : "100.00";
                    const isPsc = parseFloat(pct) >= 25;

                    return (
                      <div key={index} className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 relative">
                        {shareholders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeShareholder(index)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shareholder Name *</label>
                            <input
                              type="text"
                              value={shareholder.name}
                              onChange={(e) => updateShareholder(index, "name", e.target.value)}
                              placeholder="Full name or company name"
                              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shareholder Type</label>
                            <select
                              value={shareholder.shareholderType}
                              onChange={(e) => updateShareholder(index, "shareholderType", e.target.value)}
                              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                            >
                              <option value="Individual">Individual</option>
                              <option value="Corporate">Corporate Entity</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Number of Shares *</label>
                            <input
                              type="number"
                              value={shareholder.sharesHeld}
                              onChange={(e) => updateShareholder(index, "sharesHeld", e.target.value)}
                              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nominal Value (£)</label>
                            <input
                              type="text"
                              value={shareholder.nominalValue}
                              onChange={(e) => updateShareholder(index, "nominalValue", e.target.value)}
                              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                            />
                          </div>

                          <div className="flex flex-col justify-end">
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Holding</span>
                              <span className="text-sm font-bold text-slate-900">{pct}%</span>
                              {isPsc && (
                                <span className="block text-[10px] font-bold text-indigo-600 mt-0.5">
                                  Qualifies as PSC (&ge; 25%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & SUBMIT */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Step 5: Review &amp; Submit Form IN01</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Carefully review the incorporation details before filing directly with Companies House.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">Company Name:</span>
                      <span className="text-sm font-bold text-slate-900">{companyDetails.companyName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">Entity Type:</span>
                      <span className="text-sm font-bold text-slate-900">{companyDetails.companyType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">Registered Email:</span>
                      <span className="font-semibold text-slate-800">{companyDetails.registeredEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block">SIC Code:</span>
                      <span className="font-semibold text-slate-800">{companyDetails.sicCode}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 uppercase font-bold block">Registered Office Address:</span>
                      <span className="font-semibold text-slate-800">{companyDetails.registeredAddress}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-bold block mb-1">Appointed Officers ({officers.length}):</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                      {officers.map((o, idx) => (
                        <li key={idx}><strong>{o.name}</strong> &mdash; {o.role} ({o.nationality || 'British'})</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-bold block mb-1">
                      Share Capital ({totalShares} shares &bull; £{totalShares.toFixed(2)}):
                    </span>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                      {shareholders.map((s, idx) => {
                        const pct = totalShares > 0 ? ((parseFloat(s.sharesHeld || "0") / totalShares) * 100).toFixed(2) : "100.00";
                        return (
                          <li key={idx}>
                            <strong>{s.name}</strong>: {s.sharesHeld} {s.shareClass} shares ({pct}%)
                            {parseFloat(pct) >= 25 && " [Designated PSC]"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-center">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !companyDetails.companyName.trim()) {
                      toast({ title: "Name Required", description: "Please enter a proposed company name.", type: "error" });
                      return;
                    }
                    if (step === 2 && (!companyDetails.registeredAddress.trim() || !companyDetails.registeredEmail.trim())) {
                      toast({ title: "Required Fields", description: "Registered address and email are mandatory.", type: "error" });
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => formationMutation.mutate()}
                  disabled={formationMutation.isPending}
                  className="px-8 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {formationMutation.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  Submit Formation Request (IN01)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
