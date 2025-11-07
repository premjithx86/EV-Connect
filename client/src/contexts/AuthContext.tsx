import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
  } | null;
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
    batteryCapacity?: number;
  } | null;
  interests?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery<{ user: User; profile: Profile } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, displayName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, displayName: string) => {
    await registerMutation.mutateAsync({ email, password, displayName });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: data?.user || null,
        profile: data?.profile || null,
        isLoading,
        isAuthenticated: !!data?.user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
