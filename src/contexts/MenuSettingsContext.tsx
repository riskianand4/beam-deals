import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

export interface MenuSettings {
  attendance: boolean;
  finance: boolean;
  payslip: boolean;
  vault: boolean;
  messages: boolean;
  team: boolean;
  notes: boolean;
  reports: boolean;
  approve: boolean;
  viewApproval: boolean;
}

const DEFAULT_SETTINGS: MenuSettings = {
  attendance: false,
  finance: false,
  payslip: false,
  vault: false,
  messages: false,
  team: false,
  notes: false,
  reports: false,
  approve: false,
  viewApproval: false,
};

interface MenuSettingsContextType {
  menuSettings: MenuSettings;
  updateMenuSettings: (settings: MenuSettings) => Promise<void>;
  loading: boolean;
  positionAccess: Record<string, Record<string, boolean>>;
  hasAccess: (menuKey: string) => boolean;
}

const MenuSettingsContext = createContext<MenuSettingsContextType | null>(null);

export const MenuSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [menuSettings, setMenuSettings] = useState<MenuSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [positionAccess, setPositionAccess] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getMenuSettings().catch(() => null),
      api.getPositionAccess().catch(() => ({})),
    ]).then(([settings, pa]) => {
      if (settings) {
        setMenuSettings({ ...DEFAULT_SETTINGS, ...settings } as MenuSettings);
        localStorage.setItem("menu_settings", JSON.stringify(settings));
      } else {
        const cached = localStorage.getItem("menu_settings");
        if (cached) {
          try { setMenuSettings(JSON.parse(cached)); } catch {}
        }
      }
      setPositionAccess(pa as Record<string, Record<string, boolean>>);
    }).finally(() => setLoading(false));
  }, [user]);

  const updateMenuSettings = useCallback(async (settings: MenuSettings) => {
    setMenuSettings(settings);
    localStorage.setItem("menu_settings", JSON.stringify(settings));
    try {
      await api.updateMenuSettings(settings as unknown as { [key: string]: boolean });
    } catch (err) {
      console.error("Failed to save menu settings:", err);
    }
  }, []);

  // hasAccess: returns true if user has CRUD (admin-like) access to a menu
  // Admin always has access. Employee gets access if their position has it toggled on.
  const hasAccess = useCallback((menuKey: string): boolean => {
    if (isAdmin) return true;
    if (!user) return false;
    const userPosition = user.position || "";
    const menus = positionAccess[userPosition];
    if (!menus) return false;
    return menus[menuKey] ?? false;
  }, [isAdmin, user, positionAccess]);

  return (
    <MenuSettingsContext.Provider value={{ menuSettings, updateMenuSettings, loading, positionAccess, hasAccess }}>
      {children}
    </MenuSettingsContext.Provider>
  );
};

export const useMenuSettings = () => {
  const ctx = useContext(MenuSettingsContext);
  if (!ctx) throw new Error("useMenuSettings must be used within MenuSettingsProvider");
  return ctx;
};
