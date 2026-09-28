import { useTheme } from "../../hooks/useTheme";
import { Sun, Moon } from "lucide-react";

interface Props {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = "", showLabel = false }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 ${
        theme === "light"
          ? "bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-slate-700 shadow-sm"
          : "bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 shadow-inner"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {theme === "light" ? (
          <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </button>
  );
}
