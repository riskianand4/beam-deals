
-- Step 1: Fix teams SELECT policy (self-referencing bug)
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
CREATE POLICY "Team members can view teams" ON public.teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Step 1b: Fix team_members SELECT policy (self-referencing bug)
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;
CREATE POLICY "Members can view team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Step 2: Fix notifications INSERT policy (overly permissive)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 4a: Tighten tasks SELECT to user-scoped
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Step 4b: Tighten activities SELECT to user-scoped
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
CREATE POLICY "Users can view own activities" ON public.activities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
