import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Deal {
  id: string;
  title: string;
  company_id: string | null;
  contact_id: string | null;
  pipeline_id: string;
  stage_id: string;
  owner_id: string;
  value: number;
  probability: number;
  close_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  companies?: { id: string; name: string } | null;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export function useDeals(pipelineId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deals", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*, companies(id, name), contacts(id, first_name, last_name)")
        .eq("pipeline_id", pipelineId);
      if (error) throw error;
      return (data as unknown) as Deal[];
    },
    enabled: !!pipelineId,
  });

  useEffect(() => {
    const channel = supabase
      .channel("deals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: {
      title: string;
      pipeline_id: string;
      stage_id: string;
      owner_id: string;
      created_by: string;
      company_id?: string | null;
      contact_id?: string | null;
      value?: number;
      probability?: number;
      close_date?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.from("deals").insert(deal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("deals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
