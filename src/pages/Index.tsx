import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Target, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ClosingSoon } from "@/components/dashboard/ClosingSoon";
import { MiniPipelineChart } from "@/components/dashboard/MiniPipelineChart";
import { PageBanner } from "@/components/PageBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfWeek, startOfMonth, startOfQuarter } from "date-fns";

type Period = "week" | "month" | "quarter" | "all";

function getStartDate(period: Period): string | null {
  const now = new Date();
  if (period === "week") return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  if (period === "month") return startOfMonth(now).toISOString();
  if (period === "quarter") return startOfQuarter(now).toISOString();
  return null;
}

export default function Index() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Period>("all");
  const since = getStartDate(period);

  const { data: profile } = useQuery({
    queryKey: ["profile-dashboard", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", period],
    queryFn: async () => {
      let dealsQuery = supabase.from("deals").select("*", { count: "exact", head: true });
      let valueQuery = supabase.from("deals").select("value");
      if (since) {
        dealsQuery = dealsQuery.gte("created_at", since);
        valueQuery = valueQuery.gte("created_at", since);
      }
      const { count: totalDeals } = await dealsQuery;
      const { data: valueData } = await valueQuery;
      const totalValue = valueData?.reduce((sum, d: any) => sum + Number(d.value || 0), 0) || 0;

      const { data: stages } = await supabase.from("pipeline_stages").select("id, name").in("name", ["Won", "Lost"]);
      const wonId = stages?.find((s: any) => s.name === "Won")?.id;
      const lostId = stages?.find((s: any) => s.name === "Lost")?.id;
      let wonQuery = supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage_id", wonId || "");
      let lostQuery = supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage_id", lostId || "");
      if (since) {
        wonQuery = wonQuery.gte("created_at", since);
        lostQuery = lostQuery.gte("created_at", since);
      }
      const { count: wonCount } = await wonQuery;
      const { count: lostCount } = await lostQuery;
      const closedTotal = (wonCount || 0) + (lostCount || 0);
      const winRate = closedTotal > 0 ? Math.round(((wonCount || 0) / closedTotal) * 100) : 0;

      // Avg sales cycle
      let avgCycle = 0;
      if (user) {
        const { data: cycleData } = await (supabase.rpc as any)("avg_sales_cycle", {
          p_user_id: user.id,
          p_since: since,
        });
        avgCycle = Number(cycleData) || 0;
      }

      return { totalDeals: totalDeals || 0, totalValue, winRate, avgCycle };
    },
  });

  const periods: { label: string; value: Period }[] = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "This Quarter", value: "quarter" },
    { label: "All Time", value: "all" },
  ];

  const statCards = [
    { label: "Total Deals", value: String(stats?.totalDeals || 0), icon: Target, color: "hsl(210, 70%, 55%)" },
    { label: "Pipeline Value", value: formatCurrency(stats?.totalValue || 0), icon: DollarSign, color: "hsl(170, 50%, 45%)" },
    { label: "Win Rate", value: `${stats?.winRate || 0}%`, icon: TrendingUp, color: "hsl(262, 60%, 55%)" },
    { label: "Avg. Cycle", value: stats?.avgCycle ? `${stats.avgCycle} days` : "—", icon: Clock, color: "hsl(14, 98%, 60%)" },
  ];

  return (
    <div className="space-y-8">
      <PageBanner
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}`}
        description="Here's your pipeline at a glance."
        avatar={
          <Avatar className="h-12 w-12 md:h-14 md:w-14">
            <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="text-lg bg-muted text-foreground">
              {(profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        }
      >
        {isMobile ? (
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "ghost"}
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        )}
      </PageBanner>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ backgroundColor: stat.color }} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-xl font-semibold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity since={since} />
        <ClosingSoon since={since} />
      </div>

      <MiniPipelineChart />
    </div>
  );
}
