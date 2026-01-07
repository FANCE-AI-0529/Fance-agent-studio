-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_bases table
CREATE TABLE public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  index_status TEXT DEFAULT 'pending' CHECK (index_status IN ('pending', 'indexing', 'ready', 'failed')),
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER DEFAULT 512,
  chunk_overlap INTEGER DEFAULT 50,
  documents_count INTEGER DEFAULT 0,
  chunks_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create knowledge_documents table
CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT DEFAULT 'upload' CHECK (source_type IN ('upload', 'url', 'paste')),
  source_url TEXT,
  content TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
  chunks_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_chunks table with vector embedding
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector index for similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create regular indexes for foreign keys
CREATE INDEX knowledge_bases_user_id_idx ON public.knowledge_bases(user_id);
CREATE INDEX knowledge_documents_knowledge_base_id_idx ON public.knowledge_documents(knowledge_base_id);
CREATE INDEX knowledge_documents_user_id_idx ON public.knowledge_documents(user_id);
CREATE INDEX document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX document_chunks_knowledge_base_id_idx ON public.document_chunks(knowledge_base_id);

-- Add skill_type and knowledge_base_id to skills table
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS skill_type TEXT DEFAULT 'native' CHECK (skill_type IN ('native', 'mcp', 'rag')),
ADD COLUMN IF NOT EXISTS knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rag_config JSONB DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_bases
CREATE POLICY "Users can view their own knowledge bases"
ON public.knowledge_bases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge bases"
ON public.knowledge_bases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge bases"
ON public.knowledge_bases FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge bases"
ON public.knowledge_bases FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for knowledge_documents
CREATE POLICY "Users can view their own documents"
ON public.knowledge_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.knowledge_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.knowledge_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.knowledge_documents FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for document_chunks
CREATE POLICY "Users can view their own chunks"
ON public.document_chunks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chunks"
ON public.document_chunks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks"
ON public.document_chunks FOR DELETE
USING (auth.uid() = user_id);

-- Function to update knowledge base counts
CREATE OR REPLACE FUNCTION public.update_knowledge_base_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.knowledge_bases 
    SET documents_count = documents_count + 1,
        updated_at = now()
    WHERE id = NEW.knowledge_base_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.knowledge_bases 
    SET documents_count = GREATEST(0, documents_count - 1),
        updated_at = now()
    WHERE id = OLD.knowledge_base_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to update document counts
CREATE TRIGGER update_kb_document_count
AFTER INSERT OR DELETE ON public.knowledge_documents
FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_base_counts();

-- Function to update chunk counts
CREATE OR REPLACE FUNCTION public.update_document_chunk_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.knowledge_documents 
    SET chunks_count = chunks_count + 1,
        updated_at = now()
    WHERE id = NEW.document_id;
    UPDATE public.knowledge_bases 
    SET chunks_count = chunks_count + 1,
        updated_at = now()
    WHERE id = NEW.knowledge_base_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.knowledge_documents 
    SET chunks_count = GREATEST(0, chunks_count - 1),
        updated_at = now()
    WHERE id = OLD.document_id;
    UPDATE public.knowledge_bases 
    SET chunks_count = GREATEST(0, chunks_count - 1),
        updated_at = now()
    WHERE id = OLD.knowledge_base_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to update chunk counts
CREATE TRIGGER update_doc_chunk_count
AFTER INSERT OR DELETE ON public.document_chunks
FOR EACH ROW EXECUTE FUNCTION public.update_document_chunk_counts();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_knowledge_base_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  knowledge_base_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.knowledge_base_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM public.document_chunks dc
  WHERE 
    (p_user_id IS NULL OR dc.user_id = p_user_id)
    AND (p_knowledge_base_id IS NULL OR dc.knowledge_base_id = p_knowledge_base_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;