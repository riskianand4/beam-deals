import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  deal_id: string | null;
  contact_id: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  deals?: { id: string; title: string } | null;
  contacts?: { id: string; first_name: string; last_name: string } | null;
}

export function useTasks(filters?: { completed?: boolean; deal_id?: string; contact_id?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let q = supabase
        .from("tasks" as any)
        .select("*, deals(id, title), contacts(id, first_name, last_name)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (filters?.completed !== undefined) q = q.eq("completed", filters.completed);
      if (filters?.deal_id) q = q.eq("deal_id", filters.deal_id);
      if (filters?.contact_id) q = q.eq("contact_id", filters.contact_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Task[];
    },
    enabled: !!user,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: {
      user_id: string; title: string; description?: string | null;
      due_date?: string | null; priority?: string;
      deal_id?: string | null; contact_id?: string | null;
    }) => {
      const { data, error } = await (supabase.from("tasks" as any).insert(task).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase.from("tasks" as any).update(updates).eq("id", id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("tasks" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
