import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { PageBanner } from "@/components/PageBanner";

export default function Reports() {
  const { data: stageData, isLoading: stagesLoading } = useQuery({
    queryKey: ["report-stages"],
    queryFn: async () => {
      const { data: pipelines } = await supabase.from("pipelines").select("id").limit(1);
      if (!pipelines?.length) return [];
      const pid = pipelines[0].id;
      const { data: stages } = await supabase.from("pipeline_stages").select("id, name, color, position").eq("pipeline_id", pid).order("position");
      const { data: deals } = await supabase.from("deals").select("stage_id, value").eq("pipeline_id", pid);
      if (!stages) return [];
      return stages.map((s: any) => {
        const stageDeals = deals?.filter((d: any) => d.stage_id === s.id) || [];
        return { name: s.name, color: s.color, count: stageDeals.length, value: stageDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0) };
      });
    },
  });

  const { data: winRateData, isLoading: winRateLoading } = useQuery({
    queryKey: ["report-winrate"],
    queryFn: async () => {
      const { data: stages } = await supabase.from("pipeline_stages").select("id, name").in("name", ["Won", "Lost"]);
      if (!stages?.length) return { rate: 0 };
      const wonId = stages.find((s: any) => s.name === "Won")?.id;
      const lostId = stages.find((s: any) => s.name === "Lost")?.id;
      const { count: wonCount } = await supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage_id", wonId || "");
      const { count: lostCount } = await supabase.from("deals").select("*", { count: "exact", head: true }).eq("stage_id", lostId || "");
      const total = (wonCount || 0) + (lostCount || 0);
      return { rate: total > 0 ? Math.round(((wonCount || 0) / total) * 100) : 0, won: wonCount || 0, lost: lostCount || 0 };
    },
  });

  const { data: totalStats, isLoading: statsLoading } = useQuery({
    queryKey: ["report-totals"],
    queryFn: async () => {
      const { data: deals } = await supabase.from("deals").select("value");
      const totalValue = deals?.reduce((sum, d: any) => sum + Number(d.value || 0), 0) || 0;
      const avgValue = deals?.length ? totalValue / deals.length : 0;
      return { totalDeals: deals?.length || 0, totalValue, avgValue };
    },
  });

  const wonStageColor = stageData?.find((stage: any) => stage.name === "Won")?.color ?? "#2dd4a8";
  const lostStageColor = stageData?.find((stage: any) => stage.name === "Lost")?.color ?? "#d94040";

  return (
    <div className="space-y-6">
      <PageBanner title="Reports" description="Pipeline analytics and performance metrics." />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Deals", value: String(totalStats?.totalDeals || 0) },
          { label: "Pipeline Value", value: formatCurrency(totalStats?.totalValue || 0) },
          { label: "Avg Deal Size", value: formatCurrency(totalStats?.avgValue || 0) },
          { label: "Win Rate", value: `${winRateData?.rate || 0}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Deals by Stage</CardTitle></CardHeader>
          <CardContent>
            {stagesLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stageData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stageData?.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Value by Stage</CardTitle></CardHeader>
          <CardContent>
            {stagesLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stageData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {stageData?.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Wins vs Lost</CardTitle></CardHeader>
          <CardContent>
            {winRateLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Won", count: winRateData?.won || 0 },
                      { name: "Lost", count: winRateData?.lost || 0 },
                    ].filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={false}
                  >
                    <Cell fill={wonStageColor} />
                    <Cell fill={lostStageColor} />
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} deals`, name]} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string, entry: any) => {
                      const item = [
                        { name: "Won", count: winRateData?.won || 0 },
                        { name: "Lost", count: winRateData?.lost || 0 },
                      ].find((d) => d.name === value);
                      return `${value}: ${item?.count || 0}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue Share by Stage</CardTitle></CardHeader>
          <CardContent>
            {stagesLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stageData?.filter((s: any) => s.value > 0) || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={false}
                  >
                    {stageData?.filter((s: any) => s.value > 0).map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => {
                      const item = stageData?.find((s: any) => s.name === value);
                      return `${value}: ${formatCurrency(item?.value || 0)}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
