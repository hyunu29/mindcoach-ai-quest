-- Phase 7-2 Task 5: character-assets Storage 버킷 (퍼블릭 read-only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('character-assets', 'character-assets', true, 2097152, ARRAY['image/webp', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname = 'character_assets_public_read'
  ) THEN
    CREATE POLICY character_assets_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'character-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname = 'character_assets_service_write'
  ) THEN
    CREATE POLICY character_assets_service_write
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'character-assets' AND auth.role() = 'service_role');
  END IF;
END $$;
