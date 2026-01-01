-- Skill Versions table for version control
CREATE TABLE public.skill_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  
  -- Version info
  version TEXT NOT NULL,
  version_number INTEGER NOT NULL, -- Auto-incrementing version number for ordering
  
  -- Content snapshot
  content TEXT NOT NULL, -- SKILL.md content
  handler_code TEXT, -- handler.py content
  config_yaml TEXT, -- config.yaml content
  
  -- Change info
  change_summary TEXT,
  change_type TEXT NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'publish', 'rollback')),
  
  -- Metadata snapshot (for reference)
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Author info
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view versions of their own skills
CREATE POLICY "Users can view versions of their own skills"
ON public.skill_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.skills 
    WHERE skills.id = skill_versions.skill_id 
    AND skills.author_id = auth.uid()
  )
);

-- Users can insert versions for their own skills
CREATE POLICY "Users can insert versions for their own skills"
ON public.skill_versions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.skills 
    WHERE skills.id = skill_versions.skill_id 
    AND skills.author_id = auth.uid()
  )
);

-- Index for fast version lookups
CREATE INDEX idx_skill_versions_skill ON public.skill_versions(skill_id, version_number DESC);
CREATE INDEX idx_skill_versions_created ON public.skill_versions(skill_id, created_at DESC);

-- Function to get next version number for a skill
CREATE OR REPLACE FUNCTION public.get_next_skill_version_number(p_skill_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM public.skill_versions
  WHERE skill_id = p_skill_id
$$;

-- Trigger to auto-create version on skill update
CREATE OR REPLACE FUNCTION public.create_skill_version_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only create version if content changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    next_version := public.get_next_skill_version_number(NEW.id);
    
    INSERT INTO public.skill_versions (
      skill_id,
      version,
      version_number,
      content,
      metadata,
      change_type,
      change_summary,
      created_by
    ) VALUES (
      NEW.id,
      NEW.version,
      next_version,
      NEW.content,
      jsonb_build_object(
        'name', NEW.name,
        'description', NEW.description,
        'permissions', NEW.permissions,
        'inputs', NEW.inputs,
        'outputs', NEW.outputs,
        'category', NEW.category
      ),
      'update',
      'Content updated',
      NEW.author_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER skill_version_on_update
AFTER UPDATE ON public.skills
FOR EACH ROW
EXECUTE FUNCTION public.create_skill_version_on_update();

-- Also create initial version on skill creation
CREATE OR REPLACE FUNCTION public.create_skill_version_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.skill_versions (
    skill_id,
    version,
    version_number,
    content,
    metadata,
    change_type,
    change_summary,
    created_by
  ) VALUES (
    NEW.id,
    NEW.version,
    1,
    NEW.content,
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'permissions', NEW.permissions,
      'inputs', NEW.inputs,
      'outputs', NEW.outputs,
      'category', NEW.category
    ),
    'create',
    'Initial version',
    NEW.author_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER skill_version_on_insert
AFTER INSERT ON public.skills
FOR EACH ROW
EXECUTE FUNCTION public.create_skill_version_on_insert();