import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const notificationTypes = [
  { key: "deal_assigned", label: "Deal assigned to me" },
  { key: "mentions", label: "Someone mentions me" },
  { key: "stage_changes", label: "Deal stage changes" },
  { key: "close_reminders", label: "Close date reminders" },
];

export function NotificationSettings() {
  return (
    <div className="space-y-6 max-w-md">
      <p className="text-sm text-muted-foreground">Choose which notifications you'd like to receive.</p>
      {notificationTypes.map((nt) => (
        <div key={nt.key} className="flex items-center justify-between">
          <Label htmlFor={nt.key} className="cursor-pointer">{nt.label}</Label>
          <Switch id={nt.key} defaultChecked />
        </div>
      ))}
    </div>
  );
}
