import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import NotificationDropdown from "@/components/NotificationDropdown";
import UserDropdown from "@/components/UserDropdown";
import CommandPalette from "@/components/CommandPalette";
import OnboardingGuide from "@/components/OnboardingGuide";
import FocusTimer from "@/components/FocusTimer";

const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { collapsed } = useSidebarContext();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    return "Selamat sore";
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "ml-16" : "ml-56"}`}>
        {/* Minimal header */}
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
            <FocusTimer />
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
