import { useEffect } from "react";
import { useRoute, useSearch, useLocation, Redirect } from "wouter";

interface SAClientWorkspacePageProps {
  params?: {
    clientId?: string;
  };
}

export default function SAClientWorkspacePage(props?: SAClientWorkspacePageProps) {
  const [, routeParams] = useRoute("/self-assessment/:clientId");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tab = searchParams.get("tab");

  const clientId = props?.params?.clientId || routeParams?.clientId || "";

  useEffect(() => {
    if (!clientId) return;

    // Map legacy ?tab=... query parameters to clean dedicated sub-routes
    switch (tab) {
      case "forms":
      case "sa100":
      case "income":
        setLocation(`/self-assessment/${clientId}/forms`, { replace: true });
        break;
      case "schedules":
      case "sa102":
      case "sa103":
      case "sa105":
      case "sa108":
      case "sa106":
        setLocation(`/self-assessment/${clientId}/schedules`, { replace: true });
        break;
      case "calculators":
      case "capital-allowances":
      case "losses":
        setLocation(`/self-assessment/${clientId}/calculators`, { replace: true });
        break;
      case "calculation":
      case "sa302":
      case "tax":
        setLocation(`/self-assessment/${clientId}/calculation`, { replace: true });
        break;
      case "poa":
      case "payments-on-account":
        setLocation(`/self-assessment/${clientId}/poa`, { replace: true });
        break;
      case "tax-due":
      case "payment":
        setLocation(`/self-assessment/${clientId}/tax-due`, { replace: true });
        break;
      case "questionnaire":
      case "checklist":
        setLocation(`/self-assessment/${clientId}/questionnaire`, { replace: true });
        break;
      case "esign":
        setLocation(`/self-assessment/${clientId}/esign`, { replace: true });
        break;
      case "submit":
      case "filing":
        setLocation(`/self-assessment/${clientId}/submit`, { replace: true });
        break;
      case "dashboard":
      default:
        setLocation(`/self-assessment/${clientId}/dashboard`, { replace: true });
        break;
    }
  }, [clientId, tab, setLocation]);

  return <Redirect to={`/self-assessment/${clientId}/dashboard`} />;
}
