-- =====================================================
-- Security Fix: Make chat-attachments bucket private
-- =====================================================

-- 1. Update the bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- 2. Drop the public access policy that allows anyone to view
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

-- 3. Create owner-only access policy for viewing attachments
-- Users can only view attachments they uploaded (stored in their user folder)
CREATE POLICY "Users can view own chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);