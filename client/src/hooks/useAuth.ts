import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  practiceId: number;
  clientId?: number;
  clientName?: string;
  portalType?: "accountant" | "sme" | "365";
  isPortalUser?: boolean;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "SanSuite-auth" }
  )
);
