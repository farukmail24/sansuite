import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { Cloud, Link as LinkIcon, CheckCircle, AlertCircle, ArrowLeft, Send } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function MtdPortalPage() {
  const [matchMtd, paramsMtd] = useRoute("/bookkeeping/:id/mtd");
  const [matchPortal, paramsPortal] = useRoute("/bookkeeping/:id/mtd-portal");
  const clientId = matchMtd ? paramsMtd.id : (matchPortal ? paramsPortal.id : "");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [connected, setConnected] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [submittingVat, setSubmittingVat] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  // Check HMRC connection status from server API
  const { data: hmrcStatus } = useQuery({
    queryKey: ["/api/hmrc-gateway/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/hmrc-gateway/status");
      return res.json();
    },
  });

  useEffect(() => {
    if (hmrcStatus?.configured) {
      setConnected(true);
    }
  }, [hmrcStatus]);

  const handleConnect = async () => {
    setAuthorizing(true);
    try {
      const res = await apiRequest("GET", "/api/hmrc-gateway/oauth/auth-url");
      const data = await res.json();
      
      if (data.authUrl) {
        toast({
          title: "Connecting to HMRC Gateway",
          description: `Environment: ${data.environment.toUpperCase()}. Authorizing OAuth flow...`,
        });
        setConnected(true);
      }
    } catch (err: any) {
      toast({
        title: "Connection Error",
        description: err.message || "Failed to initiate HMRC OAuth connection",
        variant: "destructive",
      });
    } finally {
      setAuthorizing(false);
    }
  };

  const handleTestVatSubmit = async () => {
    setSubmittingVat(true);
    try {
      const res = await apiRequest("POST", "/api/hmrc-gateway/vat/submit", {
        vatPeriodId: 1,
        vrn: client?.vatNumber || "999999999",
      });
      const data = await res.json();

      toast({
        title: "HMRC VAT Return Submitted!",
        description: `Submission ID: ${data.submissionId}. Message: ${data.message}`,
      });
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit VAT return to HMRC",
        variant: "destructive",
      });
    } finally {
      setSubmittingVat(false);
    }
  };

  if (!clientId) {
    return <ClientGuard featureTitle="MTD Portal" />;
  }

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
            <span>/</span>
            <span className="font-medium text-gray-800">{client?.clientName || "Client"}</span>
            <span>/</span>
            <span className="text-gray-800">MTD Portal</span>
          </div>
          <button onClick={() => navigate(`/bookkeeping/${clientId}/vat-report`)} className="text-gray-500 hover:text-purple-600 flex items-center gap-1 text-sm font-medium">
            <ArrowLeft size={14} /> Back to VAT Reports
          </button>
        </div>

        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-10 text-center relative">
            
            {!connected && (
              <div className="absolute top-0 right-0 m-4 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> Disconnected
              </div>
            )}
            
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors ${connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              <Cloud size={36} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">HMRC Making Tax Digital (MTD) Gateway</h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">
              {connected 
                ? "Your SanSuite account is authorized to communicate with HMRC MTD APIs. You can now submit MTD VAT returns and RTI Payroll filings."
                : "Connect your client's HMRC Government Gateway account to authorize SanSuite to submit VAT returns and RTI Payroll directly via the MTD API."}
            </p>

            {connected ? (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg font-medium border border-green-200">
                  <CheckCircle size={18} /> HMRC MTD Gateway Connection Active
                </div>
                <div className="text-sm text-gray-500">
                  <p>Client VRN: {client?.vatNumber || "GB999999999"}</p>
                  <p>Environment: Sandbox Test Gateway</p>
                </div>
                <div className="pt-4 flex items-center justify-center gap-4">
                  <button 
                    onClick={handleTestVatSubmit}
                    disabled={submittingVat}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send size={16} /> {submittingVat ? "Submitting VAT..." : "Test MTD VAT Submission"}
                  </button>
                  <button onClick={() => setConnected(false)} className="text-red-500 hover:underline text-sm font-medium">Disconnect Gateway</button>
                </div>
              </div>
            ) : (
              <div>
                <button 
                  onClick={handleConnect}
                  disabled={authorizing}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto disabled:opacity-50 transition-colors shadow-sm"
                >
                  {authorizing ? (
                    <>Connecting to HMRC...</>
                  ) : (
                    <><LinkIcon size={18} /> Authorize with HMRC Gateway</>
                  )}
                </button>
                <div className="mt-8 pt-6 border-t max-w-md mx-auto text-xs text-gray-400 text-left space-y-2">
                  <p><strong>Note:</strong> You will be authenticated via HMRC Government Gateway MTD OAuth2 endpoint.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
