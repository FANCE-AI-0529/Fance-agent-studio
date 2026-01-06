-- Extend skills table with MCP fields
ALTER TABLE public.skills
ADD COLUMN IF NOT EXISTS origin text DEFAULT 'native' CHECK (origin IN ('native', 'mcp')),
ADD COLUMN IF NOT EXISTS mcp_type text CHECK (mcp_type IS NULL OR mcp_type IN ('stdio', 'sse', 'http')),
ADD COLUMN IF NOT EXISTS transport_url text,
ADD COLUMN IF NOT EXISTS runtime_env text CHECK (runtime_env IS NULL OR runtime_env IN ('node', 'python', 'go', 'rust', 'csharp', 'java')),
ADD COLUMN IF NOT EXISTS scope text CHECK (scope IS NULL OR scope IN ('cloud', 'local', 'embedded')),
ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mcp_tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mcp_resources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS github_stars integer DEFAULT 0;

-- Create index for origin filtering
CREATE INDEX IF NOT EXISTS idx_skills_origin ON public.skills(origin);
CREATE INDEX IF NOT EXISTS idx_skills_mcp_type ON public.skills(mcp_type) WHERE mcp_type IS NOT NULL;