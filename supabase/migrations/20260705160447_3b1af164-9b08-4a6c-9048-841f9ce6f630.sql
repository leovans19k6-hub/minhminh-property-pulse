-- Phase 7B.1: add product_media to realtime publication so Product Detail
-- receives media changes (add/remove/reorder). Additive & idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'product_media'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.product_media';
  END IF;
END $$;