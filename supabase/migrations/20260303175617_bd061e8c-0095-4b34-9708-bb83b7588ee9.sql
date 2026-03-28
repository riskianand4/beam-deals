
CREATE OR REPLACE FUNCTION public.notify_on_deal_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
  VALUES (NEW.owner_id, 'New Deal Created', 'Deal "' || NEW.title || '" has been added to your pipeline.', 'deal_created', NEW.id, 'deal');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_created
  AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_insert();
