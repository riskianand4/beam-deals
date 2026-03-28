import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  deal_id: string;
  user_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  old_stage_name?: string;
  new_stage_name?: string;
}

export function useDealAuditLog(dealId: string | undefined) {
  return useQuery({
    queryKey: ["deal-audit-log", dealId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("deal_audit_log" as any)
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;

      // Resolve stage names
      const entries = data as AuditEntry[];
      const stageIds = new Set<string>();
      entries.forEach((e) => {
        if (e.field === "stage_id") {
          if (e.old_value) stageIds.add(e.old_value);
          if (e.new_value) stageIds.add(e.new_value);
        }
      });

      let stageMap: Record<string, string> = {};
      if (stageIds.size > 0) {
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name")
          .in("id", Array.from(stageIds));
        stages?.forEach((s) => { stageMap[s.id] = s.name; });
      }

      return entries.map((e) => ({
        ...e,
        old_stage_name: e.field === "stage_id" && e.old_value ? stageMap[e.old_value] : undefined,
        new_stage_name: e.field === "stage_id" && e.new_value ? stageMap[e.new_value] : undefined,
      }));
    },
    enabled: !!dealId,
  });
}
