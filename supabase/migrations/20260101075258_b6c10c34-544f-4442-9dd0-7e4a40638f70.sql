-- Create template version history table
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.task_chain_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  icon TEXT NOT NULL DEFAULT 'FileText',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view versions of their templates"
ON public.template_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.task_chain_templates t
    WHERE t.id = template_id AND (t.user_id = auth.uid() OR t.is_shared = true)
  )
);

CREATE POLICY "Users can create versions for their templates"
ON public.template_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_chain_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete versions of their templates"
ON public.template_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.task_chain_templates t
    WHERE t.id = template_id AND t.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_template_versions_template_id ON public.template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON public.template_versions(created_at DESC);

-- Create function to auto-save version on template update
CREATE OR REPLACE FUNCTION public.save_template_version()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- Get the latest version number for this template
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM public.template_versions
  WHERE template_id = OLD.id;

  -- Insert the old version into history
  INSERT INTO public.template_versions (
    template_id,
    version_number,
    name,
    description,
    category,
    icon,
    steps,
    change_summary,
    created_by
  ) VALUES (
    OLD.id,
    latest_version + 1,
    OLD.name,
    OLD.description,
    OLD.category,
    OLD.icon,
    OLD.steps,
    '自动保存',
    auth.uid()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to save version before update
CREATE TRIGGER save_template_version_trigger
BEFORE UPDATE ON public.task_chain_templates
FOR EACH ROW
EXECUTE FUNCTION public.save_template_version();