-- Storage policies for store-assets bucket to fix logo upload
-- Allow public read (only for this bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for store-assets'
  ) THEN
    CREATE POLICY "Public read for store-assets"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload to store-assets'
  ) THEN
    CREATE POLICY "Authenticated can upload to store-assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can update store-assets'
  ) THEN
    CREATE POLICY "Authenticated can update store-assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'store-assets')
    WITH CHECK (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can delete store-assets'
  ) THEN
    CREATE POLICY "Authenticated can delete store-assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'store-assets');
  END IF;
END $$;