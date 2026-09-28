import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      // DEFAULT IS STRICTLY "light" per user request
      theme: "light",
      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
      toggleTheme: () => {
        set((state) => {
          const next = state.theme === "light" ? "dark" : "light";
          applyThemeToDOM(next);
          return { theme: next };
        });
      },
    }),
    {
      name: "sansuite_marketing_theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM("light");
        }
      },
    }
  )
);

// Immediately initialize theme on script load
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("sansuite_marketing_theme");
    if (saved) {
      const parsed = JSON.parse(saved);
      applyThemeToDOM(parsed?.state?.theme || "light");
    } else {
      applyThemeToDOM("light");
    }
  } catch {
    applyThemeToDOM("light");
  }
}
