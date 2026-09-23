import { useToast } from "../../hooks/useToast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border-l-4 pointer-events-auto min-w-[300px] max-w-[400px] transform transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${
            t.type === "success"
              ? "border-green-500"
              : t.type === "error"
              ? "border-red-500"
              : t.type === "warning"
              ? "border-yellow-500"
              : "border-blue-500"
          }`}
        >
          <div className="mt-0.5">
            {t.type === "success" && <CheckCircle2 size={18} className="text-green-500" />}
            {t.type === "error" && <AlertCircle size={18} className="text-red-500" />}
            {t.type === "warning" && <AlertTriangle size={18} className="text-yellow-500" />}
            {t.type === "info" && <Info size={18} className="text-blue-500" />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-800">{t.title}</h4>
            {t.description && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
