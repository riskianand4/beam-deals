import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("email_templates" as any).select("*").order("name") as any);
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!user,
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: { user_id: string; name: string; subject: string; body: string }) => {
      const { data, error } = await (supabase.from("email_templates" as any).insert(template).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; subject?: string; body?: string }) => {
      const { data, error } = await (supabase.from("email_templates" as any).update(updates).eq("id", id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("email_templates" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}
