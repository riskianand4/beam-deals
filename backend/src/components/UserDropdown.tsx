import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const UserDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name?.split(" ").map((n) => n[0]).join("") ?? "?";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-md hover:bg-muted transition-colors outline-none">
          <Avatar className="w-8 h-8">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="bg-primary text-primary-foreground w-fit hover:bg-primary/70 capitalize text-[10px] mt-1">
              {user?.role === "admin" ? "Admin" : "Karyawan"}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" /> Profil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
          <Settings className="w-4 h-4" /> Pengaturan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
