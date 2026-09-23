import { useState, useEffect, useMemo } from "react";
import { X, Building2, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  getCompanyTypeLabel,
  getCompanyStatusLabel,
  getStatusBadgeClass,
  parseSicCodes
} from "../../lib/chEnumerations";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientType?: string;
}

export default function NewClientModal({ isOpen, onClose, defaultClientType = "Limited" }: NewClientModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    clientCode: "",
    clientType: defaultClientType,
    contactFirstName: "",
    contactLastName: "",
    clientName: "",
    isCic: false,
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    county: "",
    country: "United Kingdom",
    email: "",
    phone: "",
    website: "",
    businessStartDate: "",
    bookStartDate: "",
    yearEndMonth: "March",
    yearEndDay: "31",
    registrationNumber: "",
    utrNumber: "",
    vatScheme: "Non-VAT Registered",
    vatRegNo: "",
    vatRegDate: "",
    vatSubmitType: "Quarterly",
    accountOfficeRefNo: "",
    payeRefNo: "",
    nextCsDue: "",
    nextAccountsDue: "",
    tradingStatus: "Trading",
    sicCode: "",
    niNumber: "",
    dateOfBirth: "",
  });
  const [isLookupPending, setIsLookupPending] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch practice contacts for dropdown
  const { data: contactsListData } = useQuery<any[]>({
    queryKey: ["/api/myadmin/contacts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    }
  });
  const contactsList = contactsListData || [];

  // Deduplicate contacts by name (handling "Last, First" and titles)
  const uniqueContacts = useMemo(() => {
    const seen = new Set<string>();
    return contactsList.filter((contact: any) => {
      if (!contact.name) return false;
      let normName = contact.name.toUpperCase().trim();
      
      // Filter out corporate bodies (LTD, LIMITED, LLP, PLC, COMPANY)
      const corporateKeywords = [" LTD", " LIMITED", " LLP", " PLC", " COMPANY", " INC", " CORP"];
      if (corporateKeywords.some(kw => normName.includes(kw))) {
        return false; // Skip companies
      }

      // Remove common prefixes
      normName = normName.replace(/^(MR|MRS|MS|DR|MISS)\s+/i, '');
      // Handle "Last, First" format
      if (normName.includes(',')) {
        const parts = normName.split(',').map((p: string) => p.trim());
        if (parts.length === 2) {
          normName = `${parts[1]} ${parts[0]}`;
        }
      }
      if (seen.has(normName)) {
        return false;
      }
      seen.add(normName);
      return true;
    });
  }, [contactsList]);

  useEffect(() => {
    if (isOpen) {
      const randomNum = Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({ 
        ...prev, 
        clientCode: prev.clientCode || `CAP-${randomNum}`,
        clientType: prev.clientCode ? prev.clientType : (defaultClientType || prev.clientType)
      }));
    }
  }, [isOpen, defaultClientType]);

  // Auto-fill Client Name for Individuals
  useEffect(() => {
    if (["Individual", "SoleTrader", "Partnership"].includes(formData.clientType)) {
      const autoName = `${formData.contactFirstName} ${formData.contactLastName}`.trim();
      setFormData(prev => ({ ...prev, clientName: autoName }));
    }
  }, [formData.contactFirstName, formData.contactLastName, formData.clientType]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      // Format data to match backend expectations
      const payload = {
        ...data,
        vatNumber: data.vatRegNo,
        payeReference: data.payeRefNo,
        payeAccountsOfficeRef: data.accountOfficeRefNo,
        yearEnd: `${data.yearEndMonth} ${data.yearEndDay}`,
        address: [data.addressLine1, data.addressLine2, data.city, data.county].filter(Boolean).join(", "),
        customFieldsJson: JSON.stringify({
          firstName: data.contactFirstName,
          lastName: data.contactLastName,
          website: data.website,
          vatRegDate: data.vatRegDate,
          vatSubmitType: data.vatSubmitType,
          isCic: data.isCic,
          vatRegNo: data.vatRegNo,
          dateOfBirth: data.dateOfBirth
        }),
        niNumber: data.niNumber
      };

      const res = await apiRequest("POST", "/api/pm/clients", payload);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Client Added", description: "New client has been successfully created.", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/self-assessment/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts-production/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/corporation-tax/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/bookkeeping/clients"] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Failed to Add Client", description: error.message, type: "error" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData);
  };

  const handleLookup = async () => {
    const term = formData.clientName || formData.registrationNumber;
    if (!term) {
      toast({ title: "Lookup Failed", description: "Please enter a Company Name or Registration No. to search.", type: "error" });
      return;
    }
    setIsLookupPending(true);
    setShowSearchResults(false);
    try {
      const res = await apiRequest("GET", `/api/companies-house/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to lookup company");
      }
      const searchData = await res.json();
      const items = searchData.items || [];

      if (items.length === 0) {
        throw new Error("No matching company found on Companies House.");
      }

      setSearchResults(items);
      setShowSearchResults(true);
    } catch (err: any) {
      toast({ title: "Lookup Failed", description: err.message, type: "error" });
    } finally {
      setIsLookupPending(false);
    }
  };

  const selectCompany = async (company: any) => {
    setShowSearchResults(false);
    setIsLookupPending(true);
    try {
      const crn = company.company_number;
      let data = company;
      if (crn) {
        const detailRes = await apiRequest("GET", `/api/companies-house/company/${crn}`);
        if (detailRes.ok) {
          data = await detailRes.json();
        }
      }

      const csDue = data.confirmation_statement?.next_due || data.confirmation_statement?.next_made_up_to || "";
      const accDue = data.accounts?.next_accounts?.due_on || data.accounts?.next_due || "";

      const cType = (data.company_type || "").toLowerCase();
      const mappedType = cType.includes("llp") ? "Partnership" : cType.includes("sole") ? "SoleTrader" : "Limited";
      const incDate = data.date_of_creation || "";
      
      const companyStatus = data.company_status || "";
      let tStatus = "Trading";
      if (companyStatus.toLowerCase().includes("dissolved")) {
        tStatus = "Ceased";
      } else if (companyStatus.toLowerCase().includes("dormant")) {
        tStatus = "Dormant";
      }

      const sicCodes = Array.isArray(data.sic_codes) ? data.sic_codes.join(", ") : (data.sic_codes || "");

      let yEndMonth = "March";
      let yEndDay = "31";
      if (accDue) {
        const d = new Date(accDue);
        if (!isNaN(d.getTime())) {
          yEndMonth = d.toLocaleString('en-US', { month: 'long' });
          yEndDay = d.getDate().toString();
        }
      }

      // Fetch officers to populate contact name
      let contactFirstName = formData.contactFirstName;
      let contactLastName = formData.contactLastName;
      if (crn) {
        try {
          const offRes = await apiRequest("GET", `/api/companies-house/company/${crn}/officers`);
          if (offRes.ok) {
            const offData = await offRes.json();
            const firstActive = (offData.items || []).find((o: any) => !o.resigned_on);
            if (firstActive && firstActive.name) {
              const nameParts = firstActive.name.split(",");
              if (nameParts.length > 1) {
                contactLastName = nameParts[0].trim();
                contactFirstName = nameParts[1].trim().split(" ")[0]; // just get first word after comma
              } else {
                const parts = firstActive.name.split(" ");
                contactLastName = parts.pop() || "";
                contactFirstName = parts.join(" ") || "";
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch officers", e);
        }
      }

      const addr = data.registered_office_address || data.address || {};

      setFormData(prev => ({
        ...prev,
        clientName: data.company_name || data.title || prev.clientName,
        registrationNumber: data.company_number || prev.registrationNumber,
        clientType: mappedType,
        contactFirstName,
        contactLastName,
        addressLine1: addr.address_line_1 || addr.premises || prev.addressLine1,
        addressLine2: addr.address_line_2 || prev.addressLine2,
        city: addr.locality || prev.city,
        county: addr.region || prev.county,
        postcode: addr.postal_code || prev.postcode,
        country: addr.country || "United Kingdom",
        businessStartDate: incDate || prev.businessStartDate,
        bookStartDate: incDate || prev.bookStartDate,
        yearEndMonth: yEndMonth,
        yearEndDay: yEndDay,
        nextCsDue: csDue,
        nextAccountsDue: accDue,
        tradingStatus: tStatus,
        sicCode: sicCodes,
        chDataJson: JSON.stringify(data)
      }));

      toast({ title: "Lookup Successful", description: `Auto-filled details for ${data.company_name || data.title}`, type: "success" });
    } catch (err: any) {
      toast({ title: "Details Fetch Failed", description: err.message, type: "error" });
    } finally {
      setIsLookupPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-purple-600" size={20} /> Register New Client
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
          <form id="new-client-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-2">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Client ID</label>
                <input required value={formData.clientCode} onChange={e => setFormData({ ...formData, clientCode: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Client Type</label>
                <select value={formData.clientType} onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow">
                  <option value="Limited">Limited Company (Ltd)</option>
                  <option value="SoleTrader">Sole Trader</option>
                  <option value="Partnership">Partnership (LLP)</option>
                  <option value="Individual">Individual</option>
                  <option value="Trust">Trust</option>
                  <option value="Charity">Charity</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Select Contact</label>
                {["Individual", "SoleTrader", "Partnership"].includes(formData.clientType) ? (
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow"
                      onChange={(e) => {
                        const contact = contactsList.find((c: any) => c.id === Number(e.target.value));
                        if (contact) {
                          const nameParts = contact.name.split(' ');
                          setFormData(prev => ({
                            ...prev,
                            contactFirstName: nameParts[0] || "",
                            contactLastName: nameParts.slice(1).join(' ') || "",
                            email: contact.email || prev.email,
                            phone: contact.phone || prev.phone,
                            addressLine1: contact.address || prev.addressLine1
                          }));
                        }
                      }}
                    >
                      <option value="">-- Create New or Select Existing Contact --</option>
                      {uniqueContacts.map((contact: any) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} {contact.email ? `(${contact.email})` : ""} - {contact.contactType}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input value={formData.contactFirstName} onChange={e => setFormData({ ...formData, contactFirstName: e.target.value })} placeholder="First Name" className="w-1/2 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                      <input value={formData.contactLastName} onChange={e => setFormData({ ...formData, contactLastName: e.target.value })} placeholder="Last Name" className="w-1/2 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={formData.contactFirstName} onChange={e => setFormData({ ...formData, contactFirstName: e.target.value })} placeholder="First Name" className="w-1/2 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                    <input value={formData.contactLastName} onChange={e => setFormData({ ...formData, contactLastName: e.target.value })} placeholder="Last Name" className="w-1/2 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                  </div>
                )}
              </div>

              {!["Individual", "SoleTrader", "Partnership"].includes(formData.clientType) && (
                <>
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-xs font-semibold text-slate-700">Name *</label>
                    <div className="flex shadow-sm rounded-lg relative">
                      <input required value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="e.g. Acme Corporation" className="w-full text-xs border border-slate-200 bg-white rounded-l-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow z-10" />
                      <button type="button" onClick={handleLookup} disabled={isLookupPending} className="px-4 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-medium text-xs border border-purple-600 z-0 disabled:opacity-70 whitespace-nowrap">
                        {isLookupPending ? "..." : <><Search size={14} className="mr-1" /> Lookup</>}
                      </button>
                    </div>
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-60 overflow-y-auto text-xs">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
                          <span className="font-semibold text-slate-600">Select a company</span>
                          <button type="button" onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        </div>
                        {searchResults.map((company, idx) => (
                          <button type="button" key={idx} onClick={() => selectCompany(company)} className="w-full text-left p-2.5 hover:bg-purple-50 border-b border-slate-50 last:border-0 transition-colors">
                            <div className="font-semibold text-purple-900">{company.title || company.company_name}</div>
                            <div className="text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-mono font-medium">CRN: {company.company_number}</span>
                              {company.company_type && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                  {getCompanyTypeLabel(company.company_type)}
                                </span>
                              )}
                              {company.company_status && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getStatusBadgeClass(company.company_status)}`}>
                                  {getCompanyStatusLabel(company.company_status)}
                                </span>
                              )}
                            </div>
                            {company.address_snippet && <div className="text-slate-400 mt-1 truncate">{company.address_snippet}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Is this a CIC?</label>
                    <div className="flex items-center h-7">
                      <input type="checkbox" checked={formData.isCic} onChange={e => setFormData({ ...formData, isCic: e.target.checked })} className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Address Line 1</label>
                <input value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Address Line 1" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Address Line 2</label>
                <input value={formData.addressLine2} onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Address Line 2" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-semibold text-slate-700">City/Town</label>
                  <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="City/Town" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                </div>
                <div className="flex flex-col gap-1 w-32">
                  <label className="text-xs font-semibold text-slate-700">Postcode</label>
                  <input value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} placeholder="Postcode" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 uppercase focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Country</label>
                <select value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow">
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@company.com" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="020 7946 0123" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Website</label>
                <input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.company.com" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Business Start Date</label>
                <input type="date" value={formData.businessStartDate} onChange={e => setFormData({ ...formData, businessStartDate: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Book Start Date</label>
                <input type="date" value={formData.bookStartDate} onChange={e => setFormData({ ...formData, bookStartDate: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Year End</label>
                <div className="flex gap-2">
                  <select value={formData.yearEndMonth} onChange={e => setFormData({ ...formData, yearEndMonth: e.target.value })} className="flex-1 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow">
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select value={formData.yearEndDay} onChange={e => setFormData({ ...formData, yearEndDay: e.target.value })} className="w-24 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow">
                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!["Individual", "SoleTrader"].includes(formData.clientType) && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Registration No.</label>
                  <input value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="CRN (e.g. 12345678)" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">UTR No.</label>
                <input value={formData.utrNumber} onChange={e => setFormData({ ...formData, utrNumber: e.target.value })}
                  placeholder="Unique Tax Reference" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              {["Individual", "SoleTrader", "Partnership"].includes(formData.clientType) && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Insurance No. (NiNo)</label>
                    <input value={formData.niNumber} onChange={e => setFormData({ ...formData, niNumber: e.target.value })}
                      placeholder="e.g. QQ123456C" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                    <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">VAT Scheme</label>
                <select value={formData.vatScheme} onChange={e => setFormData({ ...formData, vatScheme: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow">
                  <option value="Accrual Based">Accrual Based</option>
                  <option value="Cash Based">Cash Based</option>
                  <option value="Non-VAT Registered">Non-VAT Registered</option>
                  <option value="Flat Rate">Flat Rate</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">VAT Reg. No.</label>
                <input value={formData.vatRegNo} onChange={e => setFormData({ ...formData, vatRegNo: e.target.value })}
                  placeholder="VAT Reg. No." className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">VAT Reg. Date</label>
                <input type="date" value={formData.vatRegDate} onChange={e => setFormData({ ...formData, vatRegDate: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">VAT Submit Type</label>
                <select value={formData.vatSubmitType} onChange={e => setFormData({ ...formData, vatSubmitType: e.target.value })}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow">
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Account Office Ref No.</label>
                <input value={formData.accountOfficeRefNo} onChange={e => setFormData({ ...formData, accountOfficeRefNo: e.target.value })}
                  placeholder="e.g. 123PA00123456" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">PAYE Ref No.</label>
                <input value={formData.payeRefNo} onChange={e => setFormData({ ...formData, payeRefNo: e.target.value })}
                  placeholder="e.g. 123/ABCD121" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">SIC Code(s)</label>
                <input value={formData.sicCode} onChange={e => setFormData({ ...formData, sicCode: e.target.value })}
                  placeholder="e.g. 62020" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow font-mono" />
                {formData.sicCode && (
                  <div className="mt-1 space-y-1">
                    {parseSicCodes(formData.sicCode).map((item, idx) => (
                      <div key={idx} className="text-[11px] bg-purple-50 text-purple-800 border border-purple-100 rounded px-2 py-0.5">
                        <span className="font-mono font-bold">{item.code}:</span> {item.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-between bg-slate-50 rounded-b-2xl items-center">
          <button onClick={onClose} type="button" className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
            Cancel
          </button>
          <button form="new-client-form" type="submit" disabled={isPending} className="px-6 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-purple-700 flex items-center gap-1.5 transition-colors disabled:opacity-70">
            {isPending ? "Saving..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
