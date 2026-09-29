import React from "react";
import { useRoute, useSearch, useLocation } from "wouter";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import SA100FormReportView from "./SA100FormReportView";

export default function SAReportsPage() {
  const [matchSa302] = useRoute("/self-assessment/:clientId/sa302");
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const tabParam = searchParams.get("tab");

  const isSa302 = Boolean(matchSa302 || tabParam === "sa302" || tabParam === "computation");
  const activeSection = isSa302 ? "SA302 Computation" : "SA100 (All forms)";
  const currentTab: "sa100" | "sa302" | "poa" = isSa302 ? "sa302" : "sa100";

  return (
    <SAWorkspaceLayout activeSection={activeSection}>
      <SAReportsContent currentTab={currentTab} isSa302={isSa302} />
    </SAWorkspaceLayout>
  );
}

function SAReportsContent({ currentTab, isSa302 }: { currentTab: "sa100" | "sa302" | "poa"; isSa302: boolean }) {
  const { clientId, client, currentReturn, returns } = useSAWorkspace();
  const [, navigate] = useLocation();

  return (
    <div className="w-full space-y-4">
      <SA100FormReportView
        key={`sa-report-${clientId}-${currentReturn?.id || 0}-${currentTab}`}
        clientId={clientId}
        client={client}
        currentReturn={currentReturn}
        returns={returns}
        defaultTab={currentTab}
        onTabChange={(newTab) => {
          if (newTab === "sa302") {
            navigate(`/self-assessment/${clientId}/sa302`);
          } else {
            navigate(`/self-assessment/${clientId}/sa100`);
          }
        }}
        isModal={false}
      />
    </div>
  );
}
