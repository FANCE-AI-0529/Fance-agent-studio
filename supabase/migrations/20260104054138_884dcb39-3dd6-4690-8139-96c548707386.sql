-- SECURITY FIX: Replace traverse_entity_graph function with user-scoped version
-- The original function allowed users to traverse other users' entity graphs
-- This new version validates user ownership at each step

CREATE OR REPLACE FUNCTION public.traverse_entity_graph(
  p_entity_ids UUID[],
  p_depth INTEGER DEFAULT 2,
  p_relation_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  description TEXT,
  relation_path TEXT,
  depth INTEGER
) AS $$
WITH RECURSIVE graph_traversal AS (
  -- Starting nodes - VALIDATE USER OWNERSHIP
  SELECT 
    e.id,
    e.name,
    e.entity_type,
    e.description,
    e.name::TEXT as path,
    0 as current_depth
  FROM public.entities e
  WHERE e.id = ANY(p_entity_ids)
    AND e.user_id = auth.uid()  -- Only traverse user's own entities
  
  UNION
  
  -- Recursive traversal - VALIDATE EACH HOP
  SELECT 
    e2.id,
    e2.name,
    e2.entity_type,
    e2.description,
    gt.path || ' -> ' || r.relation_type || ' -> ' || e2.name,
    gt.current_depth + 1
  FROM graph_traversal gt
  JOIN public.entity_relations r ON r.source_entity_id = gt.id 
    AND r.user_id = auth.uid()  -- Validate relation ownership
  JOIN public.entities e2 ON e2.id = r.target_entity_id 
    AND e2.user_id = auth.uid()  -- Validate target entity ownership
  WHERE gt.current_depth < p_depth
    AND (p_relation_types IS NULL OR r.relation_type = ANY(p_relation_types))
)
SELECT DISTINCT
  gt.id,
  gt.name,
  gt.entity_type,
  gt.description,
  gt.path,
  gt.current_depth
FROM graph_traversal gt
ORDER BY gt.current_depth, gt.name;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;