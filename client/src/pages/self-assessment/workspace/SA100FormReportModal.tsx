import React, { useEffect } from "react";
import SA100FormReportView from "./SA100FormReportView";

interface SA100FormReportModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  clientId: string | number;
  client: any;
  currentReturn?: any;
  returns?: any[];
  initialTab?: "sa100" | "sa302";
}

export default function SA100FormReportModal({
  open,
  isOpen,
  onClose,
  clientId,
  client,
  currentReturn,
  returns = [],
  initialTab = "sa100",
}: SA100FormReportModalProps) {
  const isVisible = open ?? isOpen ?? false;

  useEffect(() => {
    if (isVisible) {
      document.body.classList.add("sa100-modal-open");
    } else {
      document.body.classList.remove("sa100-modal-open");
    }
    return () => {
      document.body.classList.remove("sa100-modal-open");
    };
  }, [isVisible]);

  if (!isVisible || !currentReturn) return null;

  return (
    <div
      id="sa100-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:static print:bg-white print:overflow-visible"
    >
      <div
        id="sa100-modal-dialog"
        className="relative w-full max-w-7xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[94vh] overflow-hidden print:h-auto print:max-h-none print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:static print:overflow-visible"
      >
        <SA100FormReportView
          clientId={clientId}
          client={client}
          currentReturn={currentReturn}
          returns={returns}
          defaultTab={initialTab}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
