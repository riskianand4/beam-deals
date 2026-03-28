import { useActivities } from "@/hooks/useActivities";
import { ActivityItem } from "@/components/activities/ActivityItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentActivity({ since }: { since?: string | null }) {
  const { data: activities, isLoading } = useActivities({ limit: 5, since: since || undefined });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : !activities || activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities yet. Start logging calls, emails, and meetings.</p>
        ) : (
          activities.map((a) => <ActivityItem key={a.id} activity={a} />)
        )}
      </CardContent>
    </Card>
  );
}
