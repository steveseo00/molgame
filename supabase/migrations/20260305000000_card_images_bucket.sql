-- Create card-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for card images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'card-images');

-- Allow authenticated (service role) uploads
CREATE POLICY "Service role upload for card images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'card-images');

-- Allow service role updates (upsert)
CREATE POLICY "Service role update for card images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'card-images');
