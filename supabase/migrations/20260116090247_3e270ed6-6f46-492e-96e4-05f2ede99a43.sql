-- Update knowledge-documents bucket to allow more MIME types including octet-stream as fallback
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf', 
  'text/plain', 
  'text/markdown',
  'text/x-markdown',
  'application/json', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/msword',
  'application/octet-stream'
]
WHERE id = 'knowledge-documents';