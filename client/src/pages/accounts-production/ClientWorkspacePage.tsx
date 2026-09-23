import { useEffect } from "react";
import { useRoute, useSearch, useLocation, Redirect } from "wouter";

interface ClientWorkspacePageProps {
  params?: {
    clientId?: string;
  };
}

export default function ClientWorkspacePage(props?: ClientWorkspacePageProps) {
  const [, routeParams] = useRoute("/accounts-production/:clientId");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tab = searchParams.get("tab");

  const clientId = props?.params?.clientId || routeParams?.clientId || "";

  useEffect(() => {
    if (!clientId) return;

    // Map legacy ?tab=... query parameters to clean dedicated sub-routes
    switch (tab) {
      case "statements":
        setLocation(`/accounts-production/${clientId}/statements`, { replace: true });
        break;
      case "notes":
        setLocation(`/accounts-production/${clientId}/statutory-notes`, { replace: true });
        break;
      case "policies":
        setLocation(`/accounts-production/${clientId}/accounting-policies`, { replace: true });
        break;
      case "trial-balance":
      case "tb":
        setLocation(`/accounts-production/${clientId}/trial-balance`, { replace: true });
        break;
      case "ixbrl":
      case "submit":
        setLocation(`/accounts-production/${clientId}/ixbrl-filing`, { replace: true });
        break;
      case "esign":
        setLocation(`/accounts-production/${clientId}/esign`, { replace: true });
        break;
      case "reports":
      case "settings":
        setLocation(`/accounts-production/${clientId}/reports`, { replace: true });
        break;
      case "tasks":
        setLocation(`/accounts-production/${clientId}/tasks`, { replace: true });
        break;
      case "ch-api":
        setLocation(`/accounts-production/${clientId}/ch-api`, { replace: true });
        break;
      case "ch-directors":
        setLocation(`/accounts-production/${clientId}/directors`, { replace: true });
        break;
      case "logs":
        setLocation(`/accounts-production/${clientId}/logs`, { replace: true });
        break;
      case "dashboard":
      default:
        setLocation(`/accounts-production/${clientId}/dashboard`, { replace: true });
        break;
    }
  }, [clientId, tab, setLocation]);

  return <Redirect to={`/accounts-production/${clientId}/dashboard`} />;
}
