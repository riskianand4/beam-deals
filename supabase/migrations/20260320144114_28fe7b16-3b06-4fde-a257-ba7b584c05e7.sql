
-- Fix tasks policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix email_templates policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can view own templates" ON public.email_templates;
CREATE POLICY "Users can view own templates" ON public.email_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON public.email_templates;
CREATE POLICY "Users can insert own templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON public.email_templates;
CREATE POLICY "Users can update own templates" ON public.email_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON public.email_templates;
CREATE POLICY "Users can delete own templates" ON public.email_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
