import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant: "danger" | "warning" | "info";
  } | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    let opts: ConfirmOptions;
    if (typeof options === "string") {
      const isDelete = /delete|remove|destroy|trash|clear|cancel/i.test(options);
      opts = {
        title: isDelete ? "Confirm Deletion" : "Please Confirm",
        description: options,
        confirmText: isDelete ? "Delete" : "Confirm",
        cancelText: "Cancel",
        variant: isDelete ? "danger" : "info",
      };
    } else {
      opts = options;
    }

    const variant = opts.variant || (opts.title?.toLowerCase().includes("delete") ? "danger" : "info");
    setConfig({
      title: opts.title || (variant === "danger" ? "Confirm Deletion" : "Please Confirm"),
      description: opts.description,
      confirmText: opts.confirmText || (variant === "danger" ? "Delete" : "Confirm"),
      cancelText: opts.cancelText || "Cancel",
      variant,
    });
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  // Keyboard accessibility: ESC to cancel, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, resolver]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && config && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
          >
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    config.variant === "danger"
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : config.variant === "warning"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-purple-50 text-purple-600 border border-purple-100"
                  }`}
                >
                  {config.variant === "danger" ? (
                    <Trash2 size={20} />
                  ) : config.variant === "warning" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <HelpCircle size={20} />
                  )}
                </div>

                <button
                  onClick={handleCancel}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <h3
                  id="confirm-dialog-title"
                  className="text-base font-bold text-slate-900"
                >
                  {config.title}
                </h3>
                <p
                  id="confirm-dialog-desc"
                  className="text-xs text-slate-500 mt-1.5 leading-relaxed"
                >
                  {config.description}
                </p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                {config.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                  config.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-200"
                    : config.variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-200"
                    : "bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-purple-200"
                }`}
              >
                {config.variant === "danger" && <Trash2 size={13} />}
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}
