-- Add missing columns to knowledge_nodes
ALTER TABLE public.knowledge_nodes
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add graph-related columns to knowledge_bases
ALTER TABLE public.knowledge_bases
ADD COLUMN IF NOT EXISTS graph_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nodes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS edges_count INTEGER DEFAULT 0;

-- Create index for embedding if not exists
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding ON public.knowledge_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create additional indexes if not exist
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_kb ON public.knowledge_nodes (knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON public.knowledge_nodes (knowledge_base_id, node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_kb ON public.knowledge_edges (knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON public.knowledge_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON public.knowledge_edges (target_node_id);

-- Function to update knowledge_base node/edge counts
CREATE OR REPLACE FUNCTION public.update_knowledge_graph_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'knowledge_nodes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.knowledge_bases 
      SET nodes_count = nodes_count + 1, updated_at = now()
      WHERE id = NEW.knowledge_base_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.knowledge_bases 
      SET nodes_count = GREATEST(0, nodes_count - 1), updated_at = now()
      WHERE id = OLD.knowledge_base_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'knowledge_edges' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.knowledge_bases 
      SET edges_count = edges_count + 1, updated_at = now()
      WHERE id = NEW.knowledge_base_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.knowledge_bases 
      SET edges_count = GREATEST(0, edges_count - 1), updated_at = now()
      WHERE id = OLD.knowledge_base_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop triggers if exist and recreate
DROP TRIGGER IF EXISTS update_nodes_count ON public.knowledge_nodes;
DROP TRIGGER IF EXISTS update_edges_count ON public.knowledge_edges;

CREATE TRIGGER update_nodes_count
  AFTER INSERT OR DELETE ON public.knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_graph_counts();

CREATE TRIGGER update_edges_count
  AFTER INSERT OR DELETE ON public.knowledge_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_graph_counts();

-- Function for graph traversal (2-layer depth)
CREATE OR REPLACE FUNCTION public.traverse_knowledge_graph(
  p_node_ids UUID[],
  p_depth INTEGER DEFAULT 2,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  node_id UUID,
  node_name TEXT,
  node_type TEXT,
  description TEXT,
  importance_score NUMERIC,
  relation_path TEXT,
  depth INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH RECURSIVE graph_traversal AS (
  -- Starting nodes
  SELECT 
    n.id,
    n.name,
    n.node_type,
    n.description,
    n.importance_score,
    n.name::TEXT as path,
    0 as current_depth
  FROM public.knowledge_nodes n
  WHERE n.id = ANY(p_node_ids)
    AND (p_user_id IS NULL OR n.user_id = p_user_id)
  
  UNION
  
  -- Recursive traversal
  SELECT 
    n2.id,
    n2.name,
    n2.node_type,
    n2.description,
    n2.importance_score,
    gt.path || ' -> ' || e.relation_type || ' -> ' || n2.name,
    gt.current_depth + 1
  FROM graph_traversal gt
  JOIN public.knowledge_edges e ON e.source_node_id = gt.id
  JOIN public.knowledge_nodes n2 ON n2.id = e.target_node_id
  WHERE gt.current_depth < p_depth
    AND (p_user_id IS NULL OR n2.user_id = p_user_id)
)
SELECT DISTINCT
  gt.id,
  gt.name,
  gt.node_type,
  gt.description,
  gt.importance_score,
  gt.path,
  gt.current_depth
FROM graph_traversal gt
ORDER BY gt.current_depth, gt.importance_score DESC;
$$;

-- Function to match nodes by embedding similarity
CREATE OR REPLACE FUNCTION public.match_knowledge_nodes(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  p_knowledge_base_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  knowledge_base_id uuid,
  name text,
  node_type text,
  description text,
  importance_score numeric,
  similarity double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    kn.id,
    kn.knowledge_base_id,
    kn.name,
    kn.node_type,
    kn.description,
    kn.importance_score,
    1 - (kn.embedding <=> query_embedding) as similarity
  FROM public.knowledge_nodes kn
  WHERE 
    (p_user_id IS NULL OR kn.user_id = p_user_id)
    AND (p_knowledge_base_id IS NULL OR kn.knowledge_base_id = p_knowledge_base_id)
    AND kn.embedding IS NOT NULL
    AND 1 - (kn.embedding <=> query_embedding) > match_threshold
  ORDER BY kn.embedding <=> query_embedding
  LIMIT match_count;
$$;