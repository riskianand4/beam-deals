import { useState } from "react";
import { useActivities, useDeleteActivity } from "@/hooks/useActivities";
import { ActivityItem } from "@/components/activities/ActivityItem";
import { LogActivityDialog } from "@/components/activities/LogActivityDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageBanner } from "@/components/PageBanner";
import { Plus, Activity as ActivityIcon } from "lucide-react";

export default function Activities() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const { data: activities, isLoading } = useActivities(typeFilter ? { type: typeFilter } : undefined);
  const [logOpen, setLogOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deleteActivity = useDeleteActivity();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    await Promise.all(Array.from(selected).map((id) => deleteActivity.mutateAsync(id)));
    setSelected(new Set());
    setDeleting(false);
    toast({ title: `${selected.size} activities deleted` });
  };

  return (
    <div className="space-y-6">
      <PageBanner title="Activities" description="Track all team interactions.">
        <Button className="w-full sm:w-auto" onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Activity
        </Button>
      </PageBanner>

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="call">📞 Calls</SelectItem>
            <SelectItem value="email">📧 Emails</SelectItem>
            <SelectItem value="meeting">📅 Meetings</SelectItem>
            <SelectItem value="note">📝 Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !activities?.length ? (
        <div className="flex flex-col items-center py-16">
          <ActivityIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">No activities yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Start logging calls, emails, and meetings.</p>
          <Button variant="secondary" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Log activity
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <Checkbox
                checked={selected.has(a.id)}
                onCheckedChange={() => toggleSelect(a.id)}
                className="mt-3"
              />
              <div className="flex-1">
                <ActivityItem activity={a} />
              </div>
            </div>
          ))}
        </div>
      )}

      <BulkActionBar count={selected.size} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} deleting={deleting} />
      <LogActivityDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}
