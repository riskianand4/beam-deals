
-- Allow any authenticated user to create a pipeline they own
CREATE POLICY "Users can create own pipelines"
  ON public.pipelines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow inserting stages into pipelines the user created
CREATE POLICY "Users can create stages for own pipelines"
  ON public.pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pipelines
      WHERE id = pipeline_id AND created_by = auth.uid()
    )
  );
