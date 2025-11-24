// @/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast'; // If using toasts

interface User { id: string; email: string; role: string; }
interface Profile { 
  displayName?: string; 
  avatarUrl?: string;
  bio?: string;
  location?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
  };
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
    batteryCapacity?: number;
  };
  interests?: string[];
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast(); // Optional

  // Query: Fetch current user from session on mount/refetch
  const { data: authData, isLoading: authLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      console.log("[Auth] Fetching /api/auth/me...");
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized'); // Explicit for logging
        throw new Error(`Auth fetch failed: ${res.statusText}`);
      }
      return res.json();
    },
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
  });

  useEffect(() => {
    if (authData) {
      console.log("[Auth] User data loaded:", authData.user);
      console.log("[Auth] Profile data loaded:", authData.profile);
      setUser(authData.user);
      setProfile(authData.profile || null);
    } else if (error) {
      console.error("[Auth] Auth error:", error);
      setUser(null);
      setProfile(null);
      // Optional: toast({ title: "Session expired", variant: "destructive" });
    }
    setIsLoading(authLoading);
  }, [authData, error, authLoading]);

  const handleLoginRegister = async (email: string, password: string, displayName?: string) => {
    const endpoint = displayName ? '/api/auth/register' : '/api/auth/login';
    const body = displayName 
      ? JSON.stringify({ email, password, displayName })
      : JSON.stringify({ email, password });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'include', // Essential for session cookie
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || 'Authentication failed');
    }

    const data = await res.json();
    console.log("[Login/Register] API success:", data);
    setUser(data.user); // Optimistic update
    if (data.profile) setProfile(data.profile);

    // Small delay to ensure cookie is set before refetching
    console.log("[Login/Register] Waiting for cookie to be set...");
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Refetch to sync (triggers useQuery)
    console.log("[Login/Register] Refetching user data...");
    await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
    console.log("[Login/Register] Refetch complete");
  };

  const login = (email: string, password: string) => handleLoginRegister(email, password);
  const register = (email: string, password: string, displayName: string) => handleLoginRegister(email, password, displayName);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn("[Logout] API failed but clearing local state:", err);
    }
    setUser(null);
    setProfile(null);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    window.location.reload();
    // Optional: toast({ title: "Logged out" });
  };

  const refreshProfile = async () => {
    console.log("[Auth] Refreshing profile data...");
    // Invalidate first to ensure fresh data
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    // Then refetch
    const result = await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
    console.log("[Auth] Profile refresh complete, result:", result);
  };

  const value: AuthContextType = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
};