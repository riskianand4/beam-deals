
-- Fix infinite recursion: create a SECURITY DEFINER function to check team membership
-- without triggering RLS on team_members
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = _user_id
      AND tm2.user_id = _target_user_id
  )
$$;

-- Fix profiles SELECT policy to use the new function
DROP POLICY IF EXISTS "Users can view own and team profiles" ON profiles;
CREATE POLICY "Users can view own and team profiles"
ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin')
  OR is_team_member(auth.uid(), user_id)
);

-- Fix team_members SELECT policy to avoid self-referencing
DROP POLICY IF EXISTS "Members can view team members" ON team_members;
CREATE POLICY "Members can view team members"
ON team_members FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR is_team_member(auth.uid(), user_id)
);
