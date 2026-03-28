import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  team_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function usePipelines() {
  return useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Pipeline[];
    },
  });
}

export function usePipelineStages(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline_stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!pipelineId,
  });
}
