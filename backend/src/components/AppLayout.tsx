import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { AlertTriangle, Calendar } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import NotificationDropdown from "@/components/NotificationDropdown";
import UserDropdown from "@/components/UserDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import OnboardingGuide from "@/components/OnboardingGuide";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { WarningLetter } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";

const SPWarningBadge = () => {
  const [warnings, setWarnings] = useState<WarningLetter[]>([]);

  useEffect(() => {
    api.getMyActiveWarnings().then(setWarnings).catch(() => {});
  }, []);

  if (warnings.length === 0) return null;

  const latestSP = warnings[0];
  const daysLeft = Math.max(
    0,
    differenceInDays(new Date(latestSP.expiresAt), new Date()),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
          <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Peringatan SP Aktif
        </p>
        {warnings.map((w) => {
          const days = Math.max(
            0,
            differenceInDays(new Date(w.expiresAt), new Date()),
          );
          return (
            <div
              key={w.id}
              className="p-2 rounded-lg border border-destructive/20 bg-destructive/5 mb-2 last:mb-0"
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant="destructive" className="text-[9px]">
                  {w.level}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  Sisa {days} hari
                </span>
              </div>
              <p className="text-[11px] text-foreground">{w.reason}</p>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { collapsed } = useSidebarContext();
  const { theme, toggleTheme } = useTheme();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    return "Selamat sore";
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {greeting()}, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Cek asset anda di dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler className="mr-5 "  duration={3000} />
            <SPWarningBadge />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {format(new Date(), "HH:mm", { locale: localeID })}
              </span>
            </div>
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-background">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <OnboardingGuide />
    </div>
  );
};

export default AppLayout;
