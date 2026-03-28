import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { CompanyLink, PersonalCredential } from "@/types";

interface VaultContextType {
  companyLinks: CompanyLink[];
  credentials: PersonalCredential[];
  loading: boolean;
  addCompanyLink: (link: Partial<CompanyLink>) => Promise<void>;
  removeCompanyLink: (id: string) => Promise<void>;
  updateCompanyLink: (id: string, updates: Partial<Omit<CompanyLink, "id">>) => Promise<void>;
  addCredential: (cred: Partial<PersonalCredential>) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  updateCredential: (id: string, updates: Partial<Omit<PersonalCredential, "id">>) => Promise<void>;
  refreshVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyLinks, setCompanyLinks] = useState<CompanyLink[]>([]);
  const [credentials, setCredentials] = useState<PersonalCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshVault = useCallback(async () => {
    try {
      const [links, creds] = await Promise.all([api.getCompanyLinks(), api.getCredentials()]);
      setCompanyLinks(links);
      setCredentials(creds);
    } catch (err) {
      console.error("Failed to load vault:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) refreshVault();
    else setLoading(false);
  }, [refreshVault]);

  const addCompanyLink = useCallback(async (link: Partial<CompanyLink>) => {
    const created = await api.createCompanyLink(link);
    setCompanyLinks((prev) => [...prev, created]);
  }, []);

  const removeCompanyLink = useCallback(async (id: string) => {
    await api.deleteCompanyLink(id);
    setCompanyLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateCompanyLink = useCallback(async (id: string, updates: Partial<Omit<CompanyLink, "id">>) => {
    const updated = await api.updateCompanyLink(id, updates);
    setCompanyLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  const addCredential = useCallback(async (cred: Partial<PersonalCredential>) => {
    const created = await api.createCredential(cred);
    setCredentials((prev) => [...prev, created]);
  }, []);

  const removeCredential = useCallback(async (id: string) => {
    await api.deleteCredential(id);
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCredential = useCallback(async (id: string, updates: Partial<Omit<PersonalCredential, "id">>) => {
    const updated = await api.updateCredential(id, updates);
    setCredentials((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  return (
    <VaultContext.Provider
      value={{ companyLinks, credentials, loading, addCompanyLink, removeCompanyLink, updateCompanyLink, addCredential, removeCredential, updateCredential, refreshVault }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
};
