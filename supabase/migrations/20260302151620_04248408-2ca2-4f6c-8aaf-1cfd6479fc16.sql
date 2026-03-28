
CREATE OR REPLACE FUNCTION public.seed_default_pipeline(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_pipeline_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to create pipeline for another user';
  END IF;

  INSERT INTO public.pipelines (name, created_by)
  VALUES ('Sales Pipeline', p_user_id)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, color, position) VALUES
    (v_pipeline_id, 'Prospect', '#3b82f6', 0),
    (v_pipeline_id, 'Qualified', '#8b5cf6', 1),
    (v_pipeline_id, 'Proposal', '#f97316', 2),
    (v_pipeline_id, 'Negotiation', '#eab308', 3),
    (v_pipeline_id, 'Won', '#22c55e', 4),
    (v_pipeline_id, 'Lost', '#ef4444', 5);

  RETURN v_pipeline_id;
END;
$$;
