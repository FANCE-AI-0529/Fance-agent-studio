-- Create storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents', 
  'knowledge-documents', 
  false,  -- Private bucket
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'text/markdown', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- RLS policies for knowledge-documents bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload knowledge documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view own knowledge documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own documents
CREATE POLICY "Users can update own knowledge documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own knowledge documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);