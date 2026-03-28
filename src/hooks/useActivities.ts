import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Activity {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  user_id: string;
  type: "call" | "email" | "meeting" | "note";
  title: string;
  description: string | null;
  created_at: string;
  deals?: { id: string; title: string } | null;
  contacts?: { id: string; first_name: string; last_name: string } | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export function useActivities(filters?: { type?: string; limit?: number; since?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activities", filters],
    queryFn: async () => {
      let q = supabase
        .from("activities")
        .select("*, deals(id, title), contacts(id, first_name, last_name)")
        .order("created_at", { ascending: false });
      if (filters?.type) q = q.eq("type", filters.type as any);
      if (filters?.since) q = q.gte("created_at", filters.since);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as Activity[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("activities-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activity: {
      deal_id?: string | null;
      contact_id?: string | null;
      user_id: string;
      type: "call" | "email" | "meeting" | "note";
      title: string;
      description?: string | null;
    }) => {
      const { data, error } = await supabase.from("activities").insert(activity).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string | null; type?: "call" | "email" | "meeting" | "note" }) => {
      const { data, error } = await supabase.from("activities").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
