-- 实体表：存储从文档中抽取的实体
CREATE TABLE public.entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- person, organization, document, location, concept
  description TEXT,
  source_document TEXT, -- 来源文档名称
  source_content TEXT, -- 原文片段
  embedding JSONB, -- 向量嵌入 (1536维)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 实体关系表：存储实体之间的关系
CREATE TABLE public.entity_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- belongs_to, requires, provides, located_at, manages
  strength NUMERIC DEFAULT 1.0, -- 关系强度 0-1
  description TEXT,
  is_bidirectional BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(source_entity_id, target_entity_id, relation_type)
);

-- 文档处理记录表
CREATE TABLE public.document_processing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  entities_count INTEGER DEFAULT 0,
  relations_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 启用 RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing ENABLE ROW LEVEL SECURITY;

-- entities 表策略
CREATE POLICY "Users can view their own entities"
  ON public.entities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entities"
  ON public.entities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entities"
  ON public.entities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entities"
  ON public.entities FOR DELETE
  USING (auth.uid() = user_id);

-- entity_relations 表策略
CREATE POLICY "Users can view their own relations"
  ON public.entity_relations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own relations"
  ON public.entity_relations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relations"
  ON public.entity_relations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own relations"
  ON public.entity_relations FOR DELETE
  USING (auth.uid() = user_id);

-- document_processing 表策略
CREATE POLICY "Users can view their own documents"
  ON public.document_processing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.document_processing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.document_processing FOR UPDATE
  USING (auth.uid() = user_id);

-- 索引优化
CREATE INDEX idx_entities_user_id ON public.entities(user_id);
CREATE INDEX idx_entities_agent_id ON public.entities(agent_id);
CREATE INDEX idx_entities_type ON public.entities(entity_type);
CREATE INDEX idx_entity_relations_source ON public.entity_relations(source_entity_id);
CREATE INDEX idx_entity_relations_target ON public.entity_relations(target_entity_id);
CREATE INDEX idx_entity_relations_type ON public.entity_relations(relation_type);
CREATE INDEX idx_document_processing_user ON public.document_processing(user_id);
CREATE INDEX idx_document_processing_status ON public.document_processing(status);

-- 更新时间触发器
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RSS 查询函数：计算余弦相似度
CREATE OR REPLACE FUNCTION public.cosine_similarity(a JSONB, b JSONB)
RETURNS NUMERIC AS $$
DECLARE
  dot_product NUMERIC := 0;
  norm_a NUMERIC := 0;
  norm_b NUMERIC := 0;
  i INTEGER;
  val_a NUMERIC;
  val_b NUMERIC;
BEGIN
  IF a IS NULL OR b IS NULL THEN
    RETURN 0;
  END IF;
  
  FOR i IN 0..LEAST(jsonb_array_length(a), jsonb_array_length(b)) - 1 LOOP
    val_a := (a->i)::numeric;
    val_b := (b->i)::numeric;
    dot_product := dot_product + (val_a * val_b);
    norm_a := norm_a + (val_a * val_a);
    norm_b := norm_b + (val_b * val_b);
  END LOOP;
  
  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- RSS 函数：获取与查询向量最相似的 Top-K 实体
CREATE OR REPLACE FUNCTION public.find_similar_entities(
  p_user_id UUID,
  p_query_embedding JSONB,
  p_limit INTEGER DEFAULT 5,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  similarity NUMERIC,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.entity_type,
    public.cosine_similarity(e.embedding, p_query_embedding) as sim,
    e.description
  FROM public.entities e
  WHERE e.user_id = p_user_id
    AND e.embedding IS NOT NULL
    AND (p_agent_id IS NULL OR e.agent_id = p_agent_id)
  ORDER BY sim DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RSS 函数：从锚点实体遍历获取相关子图
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
  -- 起始节点（锚点）
  SELECT 
    e.id,
    e.name,
    e.entity_type,
    e.description,
    e.name::TEXT as path,
    0 as current_depth
  FROM public.entities e
  WHERE e.id = ANY(p_entity_ids)
  
  UNION
  
  -- 递归遍历
  SELECT 
    e2.id,
    e2.name,
    e2.entity_type,
    e2.description,
    gt.path || ' -> ' || r.relation_type || ' -> ' || e2.name,
    gt.current_depth + 1
  FROM graph_traversal gt
  JOIN public.entity_relations r ON r.source_entity_id = gt.id
  JOIN public.entities e2 ON e2.id = r.target_entity_id
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