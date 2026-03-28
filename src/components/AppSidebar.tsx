import { useState } from "react";
import {
  BarChart3,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageCircleCodeIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  StickyNote,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import logo from "../assets/Logo/Logo2.png";

const MAIN_NAV = [
  {
    title: "Dasbor",
    url: "/",
    icon: LayoutDashboard,
    badgeKey: "",
    menuKey: "",
  },
  {
    title: "Tugas",
    url: "/tasks",
    icon: CheckSquare,
    badgeKey: "tasks",
    menuKey: "",
  },
  {
    title: "Catatan",
    url: "/notes",
    icon: StickyNote,
    badgeKey: "",
    menuKey: "notes",
  },
  {
    title: "Kehadiran",
    url: "/attendance",
    icon: Clock,
    badgeKey: "attendance",
    menuKey: "attendance",
  },
  {
    title: "Keuangan",
    url: "/finance",
    icon: Receipt,
    badgeKey: "finance",
    menuKey: "finance",
  },
  {
    title: "Slip Gaji",
    url: "/payslip",
    icon: FileText,
    badgeKey: "",
    menuKey: "payslip",
  },
  {
    title: "Tautan",
    url: "/vault",
    icon: Link2,
    badgeKey: "",
    menuKey: "vault",
  },
  {
    title: "Pesan",
    url: "/messages",
    icon: MessageCircleCodeIcon,
    badgeKey: "messages",
    menuKey: "messages",
  },
  { title: "Tim", url: "/team", icon: Users, badgeKey: "", menuKey: "team" },
  {
    title: "Persetujuan",
    url: "/approval",
    icon: ClipboardCheck,
    badgeKey: "",
    menuKey: "approve",
  },
];

const ADMIN_NAV = [
  {
    title: "Kelola Akun",
    url: "/accounts",
    icon: UserPlus,
    badgeKey: "",
    menuKey: "accounts",
  },
];

const TOOLS_NAV = [
  { title: "Profil", url: "/profile", icon: User, badgeKey: "", menuKey: "" },
];

export function AppSidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { tasks } = useTasks();
  const adminBadges = useAdminBadges();
  const { menuSettings, hasAccess } = useMenuSettings();
  const { collapsed, toggleSidebar } = useSidebarContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const employeePendingCount = !isAdmin
    ? tasks.filter((t) => t.assigneeId === user?.id && t.status === "todo")
      .length
    : 0;

  const getBadgeCount = (badgeKey: string): number => {
    if (!badgeKey) return 0;
    if (isAdmin) return (adminBadges as any)[badgeKey] ?? 0;
    if (badgeKey === "tasks") return employeePendingCount;
    return 0;
  };

  const doLogout = () => {
    logout();
    navigate("/login");
    setConfirmLogout(false);
  };

  const filteredMain = MAIN_NAV.filter((item) => {
    if (!item.menuKey) return true;
    // Persetujuan visible if approve OR viewApproval is enabled
    if (item.menuKey === "approve") {
      return (menuSettings as any)["approve"] ?? false;
    }
    return (menuSettings as any)[item.menuKey] ?? false;
  });

  const filteredAdmin = ADMIN_NAV.filter((item) => {
    if (!item.menuKey) return isAdmin;
    if (item.menuKey === "accounts") {
      return isAdmin || hasAccess("accounts");
    }
    if (!(menuSettings as any)[item.menuKey]) return false;
    return isAdmin || hasAccess(item.menuKey);
  });

  const allItems = [...filteredMain, ...filteredAdmin];

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const renderIcon = (item: typeof MAIN_NAV[0]) => {
    const active = isActive(item.url);
    const count = getBadgeCount(item.badgeKey);

    const button = (
      <button
        onClick={() => navigate(item.url)}
        className={cn(
          "relative w-full h-10 flex items-center justify-start px-3 gap-3 transition-all duration-200 rounded-sm overflow-hidden",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />

        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap transition-opacity duration-200",
            collapsed ? "opacity-0" : "opacity-100",
          )}
        >
          {item.title}
        </span>

        {/* Badge menyesuaikan posisi berdasarkan status sidebar */}
        {count > 0 && (
          <span
            className={cn(
              "rounded-full bg-destructive text-destructive-foreground font-bold flex items-center justify-center transition-all duration-200",
              collapsed
                ? "absolute top-1.5 right-1.5 w-2.5 h-2.5 text-[0px]"
                : "ml-auto px-1.5 py-0.5 min-w-[16px] h-4 text-[8px]",
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    );

    // Jika tertutup, bungkus dengan Tooltip. Jika terbuka, render tombol biasa.
    if (collapsed) {
      return (
        <Tooltip key={item.url} delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="text-xs font-medium"
          >
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.url} className="w-full">{button}</div>;
  };

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-sidebar-border py-4 transition-all duration-300 overflow-x-hidden overflow-y-auto backdrop-blur-md",
          collapsed ? "w-[69px] px-3" : "w-56 px-3",
        )}
      >
        <div className="flex items-center justify-start pl-2 pr-0 gap-3 mb-6 shrink-0 h-10 w-full overflow-hidden transition-all duration-300">
          <img
            src={logo}
            alt="Logo"
            className="h-8 w-8 min-w-[32px] shrink-0 object-contain"
          />
          <span
            className={cn(
              "font-bold text-lg text-sidebar-foreground whitespace-nowrap transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          >
            My Telnet
          </span>
        </div>

        <nav className="flex-1 flex flex-col items-center gap-2 w-full">
          {allItems.map(renderIcon)}
        </nav>

        <div
          className={cn(
            "h-px bg-sidebar-border my-3 shrink-0 transition-all duration-300",
            collapsed ? "w-10 mx-auto" : "w-full mx-10",
          )}
        />

        {/* Tools nav */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-full">
          {TOOLS_NAV.map(renderIcon)}
        </div>

        {/* Logout - Dibuat rata kiri statis */}
        <div className="mt-3 shrink-0 w-full">
          {collapsed
            ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="relative w-full h-10 flex items-center justify-start px-3 gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-sm overflow-hidden"
                  >
                    <LogOut
                      className="w-[18px] h-[18px] shrink-0"
                      strokeWidth={1.8}
                    />
                    <span className="text-sm font-medium whitespace-nowrap opacity-0 transition-opacity duration-200">
                      Keluar
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="text-xs font-medium"
                >
                  Keluar
                </TooltipContent>
              </Tooltip>
            )
            : (
              <button
                onClick={() => setConfirmLogout(true)}
                className="relative w-full h-10 flex items-center justify-start px-3 gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-sm overflow-hidden"
              >
                <LogOut
                  className="w-[18px] h-[18px] shrink-0"
                  strokeWidth={1.8}
                />
                <span className="text-sm font-medium whitespace-nowrap opacity-100 transition-opacity duration-200">
                  Keluar
                </span>
              </button>
            )}
        </div>

        {/* Toggle Sidebar Bawah - Dibuat rata kiri statis */}
        <div className="mt-2 shrink-0 w-full">
          {collapsed
            ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleSidebar}
                    className="relative w-full h-10 flex items-center justify-start px-3 gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 rounded-sm overflow-hidden"
                  >
                    <PanelLeftOpen
                      className="w-[18px] h-[18px] shrink-0"
                      strokeWidth={1.8}
                    />
                    <span className="text-sm font-medium whitespace-nowrap opacity-0 transition-opacity duration-200">
                      Buka Menu
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="text-xs font-medium"
                >
                  Buka Menu
                </TooltipContent>
              </Tooltip>
            )
            : (
              <button
                onClick={toggleSidebar}
                className="relative w-full h-10 flex items-center justify-start px-3 gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 rounded-sm overflow-hidden"
              >
                <PanelLeftClose
                  className="w-[18px] h-[18px] shrink-0"
                  strokeWidth={1.8}
                />
                <span className="text-sm font-medium whitespace-nowrap opacity-100 transition-opacity duration-200">
                  Tutup Menu
                </span>
              </button>
            )}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Yakin ingin keluar?"
        description="Anda akan keluar dari portal."
        confirmText="Ya, Keluar"
        variant="destructive"
        onConfirm={doLogout}
      />
    </>
  );
}
