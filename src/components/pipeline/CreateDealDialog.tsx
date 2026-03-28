import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateDeal } from "@/hooks/useDeals";
import { useCompanies, useCreateCompany } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
}

export function CreateDealDialog({ open, onOpenChange, pipelineId, stages, defaultStageId }: CreateDealDialogProps) {
  const { user } = useAuth();
  const createDeal = useCreateDeal();
  const { data: companies } = useCompanies();
  const { data: contacts } = useContacts();
  const createCompany = useCreateCompany();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [stageId, setStageId] = useState(defaultStageId || stages[0]?.id || "");
  const [value, setValue] = useState("");
  const [probability, setProbability] = useState("50");
  const [closeDate, setCloseDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !stageId) return;

    createDeal.mutate(
      {
        title,
        pipeline_id: pipelineId,
        stage_id: stageId,
        owner_id: user.id,
        created_by: user.id,
        company_id: companyId || null,
        contact_id: contactId || null,
        value: parseFloat(value) || 0,
        probability: parseInt(probability) || 50,
        close_date: closeDate || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Deal created", description: `"${title}" added to pipeline` });
          onOpenChange(false);
          setTitle(""); setCompanyId(""); setContactId(""); setValue(""); setProbability("50"); setCloseDate(""); setNotes("");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: "Failed to create deal. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Deal Title *</Label>
            <Input id="deal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Enterprise License" required maxLength={200} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-value">Value ($)</Label>
              <Input id="deal-value" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {contacts?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-probability">Probability (%)</Label>
              <Input id="deal-probability" type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-close-date">Close Date</Label>
              <Input id="deal-close-date" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea id="deal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={3} maxLength={2000} />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createDeal.isPending}>
              {createDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
