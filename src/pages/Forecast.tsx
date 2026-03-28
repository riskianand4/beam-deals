import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfMonth, addMonths } from "date-fns";
import { TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";
import { PageBanner } from "@/components/PageBanner";

export default function Forecast() {
  const { data, isLoading } = useQuery({
    queryKey: ["forecast"],
    queryFn: async () => {
      const { data: deals, error } = await supabase
        .from("deals")
        .select("value, probability, close_date, stage_id")
        .not("close_date", "is", null);
      if (error) throw error;

      // Group by month
      const months: Record<string, { total: number; weighted: number; best: number; count: number }> = {};
      const now = new Date();
      // Init next 6 months
      for (let i = 0; i < 6; i++) {
        const m = format(addMonths(startOfMonth(now), i), "yyyy-MM");
        months[m] = { total: 0, weighted: 0, best: 0, count: 0 };
      }

      deals?.forEach((d: any) => {
        const m = d.close_date?.substring(0, 7);
        if (m && months[m]) {
          const val = Number(d.value) || 0;
          const prob = Number(d.probability) || 0;
          months[m].total += val;
          months[m].weighted += val * prob / 100;
          months[m].best += val;
          months[m].count += 1;
        }
      });

      const chartData = Object.entries(months).map(([month, data]) => ({
        month: format(new Date(month + "-01"), "MMM yyyy"),
        weighted: Math.round(data.weighted),
        total: Math.round(data.total),
      }));

      const totalWeighted = Object.values(months).reduce((sum, m) => sum + m.weighted, 0);
      const totalPipeline = Object.values(months).reduce((sum, m) => sum + m.total, 0);
      const totalDeals = Object.values(months).reduce((sum, m) => sum + m.count, 0);

      return { chartData, totalWeighted, totalPipeline, totalDeals };
    },
  });

  const summaryCards = [
    { label: "Weighted Forecast", value: formatCurrency(data?.totalWeighted || 0), icon: TrendingUp, color: "hsl(var(--stage-prospect))" },
    { label: "Total Pipeline", value: formatCurrency(data?.totalPipeline || 0), icon: DollarSign, color: "hsl(var(--stage-won))" },
    { label: "Deals in Forecast", value: String(data?.totalDeals || 0), icon: Target, color: "hsl(var(--stage-qualified))" },
  ];

  return (
    <div className="space-y-6">
      <PageBanner title="Forecast" description="Revenue projections based on your pipeline." />

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: s.color }} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Monthly Revenue Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="weighted" name="Weighted" fill="hsl(245, 58%, 51%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="hsl(220, 16%, 83%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
