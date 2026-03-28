import { useState, useEffect } from "react";
import { Contact, useUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import { useActivities } from "@/hooks/useActivities";
import { useTasks } from "@/hooks/useTasks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { formatRelativeDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, Briefcase, Tag, Pencil, X, Save, Trash2, Plus, FileText } from "lucide-react";

interface ContactDetailSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailSheet({ contact, open, onOpenChange }: ContactDetailSheetProps) {
  const { data: activities } = useActivities({ limit: 20 });
  const { data: tasks } = useTasks({ contact_id: contact?.id });
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    if (contact && editing) {
      setEditFirstName(contact.first_name);
      setEditLastName(contact.last_name);
      setEditEmail(contact.email || "");
      setEditPhone(contact.phone || "");
      setEditPosition(contact.position || "");
      setEditTags(contact.tags?.join(", ") || "");
      setEditNotes((contact as any).notes || "");
    }
  }, [contact, editing]);

  if (!contact) return null;

  const contactActivities = activities?.filter((a) => a.contact_id === contact.id) || [];

  const handleSave = () => {
    updateContact.mutate(
      {
        id: contact.id,
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail || null,
        phone: editPhone || null,
        position: editPosition || null,
        tags: editTags ? editTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        notes: editNotes || null,
      },
      { onSuccess: () => { toast({ title: "Contact updated" }); setEditing(false); } }
    );
  };

  const handleDelete = () => {
    deleteContact.mutate(contact.id, {
      onSuccess: () => { toast({ title: "Contact deleted" }); onOpenChange(false); },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{contact.first_name} {contact.last_name}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Position</Label><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} /></div>
              <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="e.g. decision-maker, technical" /></div>
              <div className="space-y-2"><Label>Notes</Label><RichTextEditor value={editNotes} onChange={setEditNotes} rows={4} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateContact.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {contact.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></div>}
              {contact.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{contact.phone}</span></div>}
              {contact.position && <div className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-muted-foreground" /><span>{contact.position}</span></div>}
              {contact.companies && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{contact.companies.name}</span></div>}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {contact.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              )}
              {(contact as any).notes && (
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 mb-1"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Notes</span></div>
                  <p className="whitespace-pre-wrap">{(contact as any).notes}</p>
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Tasks</h4>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Task
              </Button>
            </div>
            {!tasks?.length ? (
              <p className="text-sm text-muted-foreground">No tasks linked.</p>
            ) : (
              <div className="space-y-2">{tasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Activity History</h4>
            {contactActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="space-y-3">
                {contactActivities.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.type} · {formatRelativeDate(a.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete Contact</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete {contact.first_name} {contact.last_name} and cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
      <CreateTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} defaultContactId={contact.id} />
    </Sheet>
  );
}
