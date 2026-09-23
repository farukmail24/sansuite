import { QueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: (failureCount, error: any) => {
        // Never retry on 429 Too Many Requests — it makes things worse
        if (error?.status === 429 || error?.message?.includes("429")) return false;
        return failureCount < 1;
      },
    },
  },
});

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const isGatewayOrTest = url.includes("/aml") || url.includes("/verify") || url.includes("/test-connection");
    const isPublicOrLogin =
      typeof window !== "undefined" &&
      (window.location.pathname === "/login" ||
        window.location.pathname.startsWith("/esign/public") ||
        window.location.pathname.startsWith("/public"));

    if (!isGatewayOrTest && !isPublicOrLogin) {
      useAuth.getState().logout();
      window.location.href = "/login";
    }
  }

  return res;
}
