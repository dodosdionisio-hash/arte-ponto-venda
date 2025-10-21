-- Create storage bucket for store assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-assets', 'store-assets', true);

-- Create storage policies for store assets
CREATE POLICY "Store assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Users can upload their own store assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own store assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own store assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);