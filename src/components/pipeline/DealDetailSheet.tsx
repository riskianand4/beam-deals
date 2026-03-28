import { Deal, useUpdateDeal, useDeleteDeal } from "@/hooks/useDeals";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useTasks } from "@/hooks/useTasks";
import { useDealAuditLog } from "@/hooks/useDealAuditLog";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Phone, Mail, Calendar, FileText, Trash2, Save, Pencil, X, Plus, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
}

export function DealDetailSheet({ deal, open, onOpenChange, stages }: DealDetailSheetProps) {
  const { user } = useAuth();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const createActivity = useCreateActivity();
  const { data: activities } = useActivities({ limit: 10 });
  const { data: tasks } = useTasks({ deal_id: deal?.id });
  const { data: auditLog } = useDealAuditLog(deal?.id);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStageId, setEditStageId] = useState("");
  const [editContactId, setEditContactId] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { data: allContacts } = useContacts();
  const { data: allCompanies } = useCompanies();

  useEffect(() => {
    if (deal && editing) {
      setEditTitle(deal.title);
      setEditValue(String(deal.value || 0));
      setEditProbability(String(deal.probability || 50));
      setEditCloseDate(deal.close_date || "");
      setEditNotes(deal.notes || "");
      setEditStageId(deal.stage_id);
      setEditContactId(deal.contact_id || "");
      setEditCompanyId(deal.company_id || "");
    }
  }, [deal, editing]);

  if (!deal) return null;

  const dealActivities = activities?.filter((a) => a.deal_id === deal.id) || [];
  const currentStage = stages.find((s) => s.id === deal.stage_id);

  const handleQuickActivity = (type: "call" | "email" | "meeting" | "note") => {
    if (!user || !activityTitle.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }
    createActivity.mutate(
      { deal_id: deal.id, user_id: user.id, type, title: activityTitle },
      { onSuccess: () => { toast({ title: "Activity logged" }); setActivityTitle(""); } }
    );
  };

  const handleSave = () => {
    updateDeal.mutate(
      {
        id: deal.id, title: editTitle, value: parseFloat(editValue) || 0,
        probability: parseInt(editProbability) || 50, close_date: editCloseDate || null,
        notes: editNotes || null, stage_id: editStageId,
        contact_id: editContactId || null, company_id: editCompanyId || null,
      },
      { onSuccess: () => { toast({ title: "Deal updated" }); setEditing(false); } }
    );
  };

  const handleDelete = () => {
    deleteDeal.mutate(deal.id, { onSuccess: () => { toast({ title: "Deal deleted" }); onOpenChange(false); } });
  };

  const formatAuditEntry = (entry: any) => {
    if (entry.field === "stage_id") {
      return `Stage changed from ${entry.old_stage_name || "unknown"} to ${entry.new_stage_name || "unknown"}`;
    }
    if (entry.field === "value") {
      return `Value changed from ${formatCurrency(Number(entry.old_value || 0))} to ${formatCurrency(Number(entry.new_value || 0))}`;
    }
    if (entry.field === "probability") {
      return `Probability changed from ${entry.old_value}% to ${entry.new_value}%`;
    }
    return `${entry.field} changed`;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: currentStage?.color }} />
              {deal.title}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Value</Label><Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} /></div>
                <div className="space-y-2"><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={editProbability} onChange={(e) => setEditProbability(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={editStageId} onValueChange={setEditStageId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={editContactId} onValueChange={setEditContactId}>
                  <SelectTrigger><SelectValue placeholder="Select contact..." /></SelectTrigger>
                  <SelectContent>{allContacts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Select company..." /></SelectTrigger>
                  <SelectContent>{allCompanies?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Close Date</Label><Input type="date" value={editCloseDate} onChange={(e) => setEditCloseDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Notes</Label><RichTextEditor value={editNotes} onChange={setEditNotes} rows={3} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateDeal.isPending}><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Value</span><p className="font-semibold text-lg">{formatCurrency(Number(deal.value))}</p></div>
                <div><span className="text-muted-foreground">Probability</span><p className="font-semibold">{deal.probability}%</p></div>
                <div><span className="text-muted-foreground">Stage</span><Badge style={{ backgroundColor: currentStage?.color, color: "white" }}>{currentStage?.name}</Badge></div>
                <div><span className="text-muted-foreground">Close Date</span><p>{deal.close_date ? formatDate(deal.close_date) : "Not set"}</p></div>
              </div>
              {deal.companies && <div className="text-sm"><span className="text-muted-foreground">Company</span><p className="font-medium">{deal.companies.name}</p></div>}
              {deal.contacts && <div className="text-sm"><span className="text-muted-foreground">Contact</span><p className="font-medium">{deal.contacts.first_name} {deal.contacts.last_name}</p></div>}
              {deal.notes && <div className="text-sm"><span className="text-muted-foreground">Notes</span><p className="mt-1 whitespace-pre-wrap">{deal.notes}</p></div>}
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

          {/* Quick Activity Log */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Log Activity</h4>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Activity title..." value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} className="flex-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleQuickActivity("call")}><Phone className="h-3 w-3 mr-1" /> Call</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickActivity("email")}><Mail className="h-3 w-3 mr-1" /> Email</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickActivity("meeting")}><Calendar className="h-3 w-3 mr-1" /> Meeting</Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickActivity("note")}><FileText className="h-3 w-3 mr-1" /> Note</Button>
            </div>
          </div>

          <Separator />

          {/* Activity Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Activity Timeline</h4>
            {dealActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities logged yet.</p>
            ) : (
              <div className="space-y-3">
                {dealActivities.map((a) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-1">
                      {a.type === "call" && <Phone className="h-4 w-4 text-blue-500" />}
                      {a.type === "email" && <Mail className="h-4 w-4 text-purple-500" />}
                      {a.type === "meeting" && <Calendar className="h-4 w-4 text-orange-500" />}
                      {a.type === "note" && <FileText className="h-4 w-4 text-green-500" />}
                    </div>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeDate(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Audit Trail */}
          {auditLog && auditLog.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <History className="h-4 w-4" /> History
                </h4>
                <div className="space-y-2">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="text-xs text-muted-foreground">
                      <p>{formatAuditEntry(entry)}</p>
                      <p className="text-[10px]">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" /> Delete Deal</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete deal?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{deal.title}" and cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
      <CreateTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} defaultDealId={deal.id} />
    </Sheet>
  );
}
