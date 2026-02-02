-- 确保 api_key_encrypted 和 api_key_preview 列存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'llm_providers' 
    AND column_name = 'api_key_encrypted'
  ) THEN
    ALTER TABLE public.llm_providers ADD COLUMN api_key_encrypted TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'llm_providers' 
    AND column_name = 'api_key_preview'
  ) THEN
    ALTER TABLE public.llm_providers ADD COLUMN api_key_preview TEXT;
  END IF;
END $$;