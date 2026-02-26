-- P1-4: Add UPDATE RLS policy for document_chunks
CREATE POLICY "Users can update their own chunks" 
ON public.document_chunks 
FOR UPDATE 
USING (auth.uid() = user_id);