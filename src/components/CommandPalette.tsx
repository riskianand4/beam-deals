import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useVault } from "@/contexts/VaultContext";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { LayoutDashboard, CheckSquare, Users, Shield, Settings, Search, BarChart3, CalendarDays, ScrollText, User, MessageCircleCodeIcon, Link as LinkIcon } from "lucide-react";

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { isAdmin, users } = useAuth();
  const { tasks } = useTasks();
  const { companyLinks } = useVault();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => { navigate(path); setOpen(false); setQuery(""); };

  const pages = [
    { label: "Dasbor", icon: LayoutDashboard, path: "/" },
    { label: "Tugas", icon: CheckSquare, path: "/tasks" },
    { label: "Kalender", icon: CalendarDays, path: "/calendar" },
    { label: "Pesan Tim", icon: MessageCircleCodeIcon, path: "/messages" },
    ...(isAdmin ? [{ label: "Direktori Tim", icon: Users, path: "/team" }] : []),
    { label: "Tautan", icon: Shield, path: "/vault" },
    { label: "Log Aktivitas", icon: ScrollText, path: "/activity" },
    { label: "Pengaturan", icon: Settings, path: "/settings" },
  ];

  const matchedTasks = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)).slice(0, 5);
  }, [query, tasks]);

  const matchedUsers = useMemo(() => {
    if (!query || query.length < 2 || !isAdmin) return [];
    const q = query.toLowerCase();
    return users.filter((u) => u.role === "employee" && u.name.toLowerCase().includes(q));
  }, [query, isAdmin, users]);

  const matchedLinks = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return companyLinks.filter((l) => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)).slice(0, 5);
  }, [query, companyLinks]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari halaman, tugas, karyawan..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Tidak ada hasil ditemukan.</CommandEmpty>
        <CommandGroup heading="Halaman">
          {pages.map((p) => (<CommandItem key={p.path} onSelect={() => go(p.path)} className="gap-3 cursor-pointer"><p.icon className="w-4 h-4 text-muted-foreground" /><span>{p.label}</span></CommandItem>))}
        </CommandGroup>
        {matchedTasks.length > 0 && (
          <CommandGroup heading="Tugas">
            {matchedTasks.map((t) => (<CommandItem key={t.id} onSelect={() => go("/tasks")} className="gap-3 cursor-pointer"><CheckSquare className="w-4 h-4 text-muted-foreground" /><div className="flex flex-col"><span className="text-sm">{t.title}</span><span className="text-[10px] text-muted-foreground capitalize">{t.status === "todo" ? "Tugas" : "Selesai"}</span></div></CommandItem>))}
          </CommandGroup>
        )}
        {matchedUsers.length > 0 && (
          <CommandGroup heading="Karyawan">
            {matchedUsers.map((u) => (<CommandItem key={u.id} onSelect={() => go("/team")} className="gap-3 cursor-pointer"><User className="w-4 h-4 text-muted-foreground" /><div className="flex flex-col"><span className="text-sm">{u.name}</span><span className="text-[10px] text-muted-foreground">{u.email}</span></div></CommandItem>))}
          </CommandGroup>
        )}
        {matchedLinks.length > 0 && (
          <CommandGroup heading="Tautan">
            {matchedLinks.map((l) => (<CommandItem key={l.id} onSelect={() => go("/vault")} className="gap-3 cursor-pointer"><LinkIcon className="w-4 h-4 text-muted-foreground" /><div className="flex flex-col"><span className="text-sm">{l.title}</span><span className="text-[10px] text-muted-foreground truncate">{l.url}</span></div></CommandItem>))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;