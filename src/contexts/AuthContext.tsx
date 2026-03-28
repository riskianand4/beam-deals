import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe().then((u) => {
        setUser(u);
        setLoading(false);
      }).catch(() => {
        api.logout();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Load users when authenticated
  useEffect(() => {
    if (user) {
      api.getUsers().then(setUsers).catch(console.error);
    }
  }, [user]);

  const refreshUsers = useCallback(async () => {
    try {
      const u = await api.getUsers();
      setUsers(u);
    } catch (err) {
      console.error("Failed to refresh users:", err);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      setUser(result.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setUsers([]);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const updated = await api.updateProfile(updates);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, users, login, logout, updateProfile,
      isAdmin: user?.role === "admin",
      loading, refreshUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
