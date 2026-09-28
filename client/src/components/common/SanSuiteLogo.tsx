import React from "react";

interface SanSuiteLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "mark" | "full";
  theme?: "light" | "dark" | "auto";
  showSubtitle?: boolean;
}

export default function SanSuiteLogo({
  className = "",
  size = "md",
  variant = "mark",
  theme = "auto",
  showSubtitle = true,
}: SanSuiteLogoProps) {
  const sizeMap = {
    xs: { box: "w-6 h-6", text: "text-base", sub: "text-[8px]" },
    sm: { box: "w-8 h-8", text: "text-lg", sub: "text-[9px]" },
    md: { box: "w-10 h-10", text: "text-xl", sub: "text-[10px]" },
    lg: { box: "w-12 h-12", text: "text-2xl", sub: "text-xs" },
    xl: { box: "w-16 h-16", text: "text-3xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  if (variant === "full") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src="/logo.svg"
          alt="SanSuite Logo"
          className={`${currentSize.box} rounded-xl shadow-md shadow-purple-500/20 object-contain hover:scale-105 transition-transform`}
          onError={(e) => {
            // Fallback to media library upload url
            (e.target as HTMLImageElement).src = "/uploads/media/sansuite-logo.svg";
          }}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${currentSize.text} font-black tracking-tight ${theme === "light" ? "text-slate-900" : theme === "dark" ? "text-white" : "text-slate-900 dark:text-white"}`}>
              San<span className="text-[#6c5ce7]">Suite</span>
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded">
              UK
            </span>
          </div>
          {showSubtitle && (
            <span className={`${currentSize.sub} font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase`}>
              Cloud Accounting
            </span>
          )}
        </div>
      </div>
    );
  }

  // Mark only
  return (
    <img
      src="/logo.svg"
      alt="SanSuite Mark"
      className={`${currentSize.box} rounded-xl shadow-md shadow-purple-500/20 object-contain hover:scale-105 transition-transform ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "/uploads/media/sansuite-logo.svg";
      }}
    />
  );
}
