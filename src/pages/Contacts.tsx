import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useContacts, Contact, useDeleteContact } from "@/hooks/useContacts";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";
import { Search, Plus, Users } from "lucide-react";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useContacts(search);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deleteContact = useDeleteContact();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && contacts) {
      const found = contacts.find((c) => c.id === openId);
      if (found) {
        setSelectedContact(found);
        searchParams.delete("open");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, contacts, setSearchParams]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!contacts) return;
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    await Promise.all(Array.from(selected).map((id) => deleteContact.mutateAsync(id)));
    setSelected(new Set());
    setDeleting(false);
    toast({ title: `${selected.size} contacts deleted` });
  };

  return (
    <div className="space-y-6">
      <PageBanner title="Contacts" description="Manage your contacts and companies.">
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Contact
        </Button>
      </PageBanner>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !contacts?.length ? (
        <div className="flex flex-col items-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">No contacts yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first contact to get started.</p>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add contact
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === contacts.length && contacts.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Position</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </TableCell>
                  <TableCell className="font-medium" onClick={() => setSelectedContact(c)}>{c.first_name} {c.last_name}</TableCell>
                  <TableCell className="text-muted-foreground" onClick={() => setSelectedContact(c)}>{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground" onClick={() => setSelectedContact(c)}>{c.companies?.name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground" onClick={() => setSelectedContact(c)}>{c.position || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell" onClick={() => setSelectedContact(c)}>
                    <div className="flex gap-1 flex-wrap">
                      {c.tags?.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BulkActionBar count={selected.size} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} deleting={deleting} />
      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ContactDetailSheet contact={selectedContact} open={!!selectedContact} onOpenChange={(o) => !o && setSelectedContact(null)} />
    </div>
  );
}
