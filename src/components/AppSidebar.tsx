import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Activity,
  Building2,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  FileSpreadsheet,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { DMark } from "@/components/DMark";

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { title: "Pipeline", icon: Kanban, to: "/pipeline" },
  { title: "Contacts", icon: Users, to: "/contacts" },
  { title: "Companies", icon: Building2, to: "/companies" },
  { title: "Activities", icon: Activity, to: "/activities" },
  { title: "Tasks", icon: CheckSquare, to: "/tasks" },
  { title: "Calendar", icon: CalendarDays, to: "/calendar" },
  { title: "Forecast", icon: TrendingUp, to: "/forecast" },
  { title: "Reports", icon: BarChart3, to: "/reports" },
  { title: "Import/Export", icon: FileSpreadsheet, to: "/data" },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-sidebar", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2">
          <DMark className="h-7 w-7 text-sidebar-foreground" />
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            Dealflow
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <div className="flex items-center gap-2 px-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="text-[10px]">{(profile?.full_name || user.email || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {profile?.full_name || user.email}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
