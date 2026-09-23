import AppLayout from "../../components/layout/AppLayout";
import { Keyboard, Command, Zap, Search, ShieldCheck } from "lucide-react";

interface ShortcutGroup {
  category: string;
  items: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    category: "Global Navigation & Search",
    items: [
      { keys: ["Ctrl", "K"], description: "Focus global search input across clients & invoices" },
      { keys: ["Alt", "N"], description: "Open Quick Add menu (Create Client, Invoice, Bill, User)" },
      { keys: ["Alt", "M"], description: "Open Module Launcher Grid" },
      { keys: ["Esc"], description: "Close active modal, dropdown, or search popup" },
    ],
  },
  {
    category: "Module Shortcuts",
    items: [
      { keys: ["Alt", "P"], description: "Navigate to Practice Management Dashboard" },
      { keys: ["Alt", "B"], description: "Navigate to Bookkeeping Dashboard" },
      { keys: ["Alt", "Y"], description: "Navigate to Payroll Engine" },
      { keys: ["Alt", "A"], description: "Navigate to Accounts Production" },
      { keys: ["Alt", "T"], description: "Navigate to Time & Fees" },
      { keys: ["Alt", "S"], description: "Navigate to eSign E-Signature Portal" },
    ],
  },
  {
    category: "Bookkeeping & Form Actions",
    items: [
      { keys: ["Ctrl", "S"], description: "Save current form or draft transaction" },
      { keys: ["Ctrl", "Enter"], description: "Submit sales invoice or bill" },
      { keys: ["Alt", "R"], description: "Refresh data query or bank feeds" },
    ],
  },
];

export default function KeyboardShortcutsPage() {
  return (
    <AppLayout module="Help & Keyboard Shortcuts">
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                <Keyboard size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h1>
                <p className="text-sm text-gray-500">Boost your productivity with quick hotkeys across SanSuite.</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-purple-200">
              <Zap size={14} /> Hotkey Engine Active
            </div>
          </div>

          {/* Shortcut Groups */}
          <div className="space-y-6">
            {shortcutGroups.map((group, gIdx) => (
              <div key={gIdx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Command size={16} className="text-purple-600" />
                  {group.category}
                </div>

                <div className="divide-y divide-gray-100">
                  {group.items.map((item, iIdx) => (
                    <div key={iIdx} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50/50">
                      <span className="text-sm text-gray-700">{item.description}</span>
                      <div className="flex items-center gap-1.5">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2.5 py-1 bg-gray-100 border border-gray-300 text-gray-800 rounded font-mono text-xs font-semibold shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
