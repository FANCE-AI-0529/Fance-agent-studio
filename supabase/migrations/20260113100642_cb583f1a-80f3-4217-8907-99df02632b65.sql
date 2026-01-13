-- Create agent_graph_nodes table for storing visual graph nodes
CREATE TABLE public.agent_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(agent_id, node_id)
);

-- Create agent_graph_edges table for storing visual graph edges
CREATE TABLE public.agent_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  edge_type TEXT DEFAULT 'default',
  data JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(agent_id, edge_id)
);

-- Create indexes for performance
CREATE INDEX idx_agent_graph_nodes_agent_id ON public.agent_graph_nodes(agent_id);
CREATE INDEX idx_agent_graph_edges_agent_id ON public.agent_graph_edges(agent_id);
CREATE INDEX idx_agent_graph_edges_source ON public.agent_graph_edges(agent_id, source_node);
CREATE INDEX idx_agent_graph_edges_target ON public.agent_graph_edges(agent_id, target_node);

-- Enable Row Level Security
ALTER TABLE public.agent_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_graph_edges ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_graph_nodes
CREATE POLICY "Users can view nodes of their agents"
  ON public.agent_graph_nodes FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can insert nodes for their agents"
  ON public.agent_graph_nodes FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can update nodes of their agents"
  ON public.agent_graph_nodes FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can delete nodes of their agents"
  ON public.agent_graph_nodes FOR DELETE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

-- RLS policies for agent_graph_edges
CREATE POLICY "Users can view edges of their agents"
  ON public.agent_graph_edges FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can insert edges for their agents"
  ON public.agent_graph_edges FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can update edges of their agents"
  ON public.agent_graph_edges FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can delete edges of their agents"
  ON public.agent_graph_edges FOR DELETE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_graph_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_graph_edges;

-- Also enable Realtime for agents table (for metadata sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_graph_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_graph_nodes_updated_at
  BEFORE UPDATE ON public.agent_graph_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_graph_updated_at();

CREATE TRIGGER update_agent_graph_edges_updated_at
  BEFORE UPDATE ON public.agent_graph_edges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_graph_updated_at();