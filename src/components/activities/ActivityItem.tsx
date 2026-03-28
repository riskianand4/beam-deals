import { useState } from "react";
import { Activity, useUpdateActivity, useDeleteActivity } from "@/hooks/useActivities";
import { formatRelativeDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Calendar, FileText, Pencil, Trash2, Save, X } from "lucide-react";

const typeConfig = {
  call: { icon: Phone, color: "text-blue-500", bg: "bg-blue-50" },
  email: { icon: Mail, color: "text-purple-500", bg: "bg-purple-50" },
  meeting: { icon: Calendar, color: "text-orange-500", bg: "bg-orange-50" },
  note: { icon: FileText, color: "text-green-500", bg: "bg-green-50" },
};

export function ActivityItem({ activity }: { activity: Activity }) {
  const config = typeConfig[activity.type];
  const Icon = config.icon;
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(activity.title);
  const [editDescription, setEditDescription] = useState(activity.description || "");
  const [editType, setEditType] = useState(activity.type);

  const handleSave = () => {
    updateActivity.mutate(
      { id: activity.id, title: editTitle, description: editDescription || null, type: editType },
      { onSuccess: () => { toast({ title: "Activity updated" }); setEditing(false); } }
    );
  };

  const handleDelete = () => {
    deleteActivity.mutate(activity.id, {
      onSuccess: () => toast({ title: "Activity deleted" }),
    });
  };

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={editType} onValueChange={(v) => setEditType(v as Activity["type"])}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">📞 Call</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="meeting">📅 Meeting</SelectItem>
              <SelectItem value="note">📝 Note</SelectItem>
            </SelectContent>
          </Select>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="flex-1" />
        </div>
        <RichTextEditor value={editDescription} onChange={setEditDescription} rows={2} placeholder="Description..." />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={updateActivity.isPending}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 rounded-lg border bg-card p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{activity.title}</p>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="capitalize">{activity.type}</span>
          {activity.deals && <span>· {activity.deals.title}</span>}
          {activity.contacts && <span>· {activity.contacts.first_name} {activity.contacts.last_name}</span>}
          <span className="ml-auto">{formatRelativeDate(activity.created_at)}</span>
        </div>
      </div>
      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete activity?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this activity.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
