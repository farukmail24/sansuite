import { useEffect } from "react";
import { useRoute, useSearch, useLocation, Redirect } from "wouter";

interface CTClientWorkspacePageProps {
  params?: {
    clientId?: string;
  };
}

export default function CTClientWorkspacePage(props?: CTClientWorkspacePageProps) {
  const [, routeParams] = useRoute("/corporation-tax/:clientId");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tab = searchParams.get("tab");

  const clientId = props?.params?.clientId || routeParams?.clientId || "";

  useEffect(() => {
    if (!clientId) return;

    // Map legacy ?tab=... query parameters to clean dedicated sub-routes
    switch (tab) {
      case "computation":
      case "ct600":
        setLocation(`/corporation-tax/${clientId}/computation`, { replace: true });
        break;
      case "calculators":
      case "capital-allowances":
      case "losses":
        setLocation(`/corporation-tax/${clientId}/calculators`, { replace: true });
        break;
      case "supplementary":
      case "ct600a":
      case "ct600l":
      case "ct600e":
        setLocation(`/corporation-tax/${clientId}/supplementary`, { replace: true });
        break;
      case "attachments":
      case "ixbrl":
        setLocation(`/corporation-tax/${clientId}/attachments`, { replace: true });
        break;
      case "tax-due":
      case "payment":
        setLocation(`/corporation-tax/${clientId}/tax-due`, { replace: true });
        break;
      case "esign":
        setLocation(`/corporation-tax/${clientId}/esign`, { replace: true });
        break;
      case "submit":
      case "filing":
        setLocation(`/corporation-tax/${clientId}/submit`, { replace: true });
        break;
      case "dashboard":
      default:
        setLocation(`/corporation-tax/${clientId}/dashboard`, { replace: true });
        break;
    }
  }, [clientId, tab, setLocation]);

  return <Redirect to={`/corporation-tax/${clientId}/dashboard`} />;
}
