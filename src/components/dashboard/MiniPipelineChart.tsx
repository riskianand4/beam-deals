import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export function MiniPipelineChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-chart"],
    queryFn: async () => {
      // Get first pipeline
      const { data: pipelines } = await supabase.from("pipelines").select("id").limit(1);
      if (!pipelines?.length) return [];
      const pipelineId = pipelines[0].id;

      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, position")
        .eq("pipeline_id", pipelineId)
        .order("position");

      const { data: deals } = await supabase
        .from("deals")
        .select("stage_id")
        .eq("pipeline_id", pipelineId);

      if (!stages) return [];

      return stages.map((s: any) => ({
        name: s.name,
        color: s.color,
        count: deals?.filter((d: any) => d.stage_id === s.id).length || 0,
      }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a pipeline to see the chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
