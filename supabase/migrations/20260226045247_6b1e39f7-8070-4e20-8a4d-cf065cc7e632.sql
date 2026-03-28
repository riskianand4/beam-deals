
-- DEALS: Add permissive UPDATE and DELETE policies
CREATE POLICY "Owner can update own deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- CONTACTS: Add permissive UPDATE and DELETE policies
CREATE POLICY "Creator can update own contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete own contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ACTIVITIES: Add permissive UPDATE and DELETE policies (none existed)
CREATE POLICY "Creator can update own activities"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creator can delete own activities"
  ON public.activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
