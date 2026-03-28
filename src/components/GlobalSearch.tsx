import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Kanban, Users, Activity, Building2, Search, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setDeals([]); setContacts([]); setCompanies([]); setActivities([]); setTasks([]);
      return;
    }
    const pattern = `%${term}%`;
    const [d, c, co, a, t] = await Promise.all([
      supabase.from("deals").select("id, title, value").ilike("title", pattern).limit(5),
      supabase.from("contacts").select("id, first_name, last_name, email").or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`).limit(5),
      supabase.from("companies").select("id, name, industry").ilike("name", pattern).limit(5),
      supabase.from("activities").select("id, title, type").ilike("title", pattern).limit(5),
      (supabase.from("tasks" as any).select("id, title, priority, completed").ilike("title", pattern).limit(5) as any),
    ]);
    setDeals(d.data || []);
    setContacts(c.data || []);
    setCompanies(co.data || []);
    setActivities(a.data || []);
    setTasks(t.data || []);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setQuery("");
    if (type === "deals") navigate(`/pipeline?open=${id}`);
    else if (type === "contacts") navigate(`/contacts?open=${id}`);
    else if (type === "companies") navigate(`/companies?open=${id}`);
    else if (type === "activities") navigate(`/activities?open=${id}`);
    else if (type === "tasks") navigate(`/tasks`);
  };

  const hasResults = deals.length > 0 || contacts.length > 0 || companies.length > 0 || activities.length > 0 || tasks.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search deals, contacts, companies, tasks..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim() && !hasResults && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {!query.trim() && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search across your CRM...
            </div>
          )}
          {deals.length > 0 && (
            <CommandGroup heading="Deals">
              {deals.map((d) => (
                <CommandItem key={d.id} value={`deal-${d.id}`} onSelect={() => handleSelect("deals", d.id)}>
                  <Kanban className="mr-2 h-4 w-4" />
                  {d.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {contacts.length > 0 && (
            <CommandGroup heading="Contacts">
              {contacts.map((c) => (
                <CommandItem key={c.id} value={`contact-${c.id}`} onSelect={() => handleSelect("contacts", c.id)}>
                  <Users className="mr-2 h-4 w-4" />
                  {c.first_name} {c.last_name}
                  {c.email && <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {companies.length > 0 && (
            <CommandGroup heading="Companies">
              {companies.map((co) => (
                <CommandItem key={co.id} value={`company-${co.id}`} onSelect={() => handleSelect("companies", co.id)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  {co.name}
                  {co.industry && <span className="ml-2 text-xs text-muted-foreground">{co.industry}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {activities.length > 0 && (
            <CommandGroup heading="Activities">
              {activities.map((a) => (
                <CommandItem key={a.id} value={`activity-${a.id}`} onSelect={() => handleSelect("activities", a.id)}>
                  <Activity className="mr-2 h-4 w-4" />
                  {a.title}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{a.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.map((t: any) => (
                <CommandItem key={t.id} value={`task-${t.id}`} onSelect={() => handleSelect("tasks", t.id)}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {t.title}
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{t.priority}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
