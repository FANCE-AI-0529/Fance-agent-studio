-- 创建资产同步到语义索引的函数
CREATE OR REPLACE FUNCTION sync_asset_to_semantic_index()
RETURNS TRIGGER AS $$
BEGIN
  -- 对于知识库
  IF TG_TABLE_NAME = 'knowledge_bases' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM asset_semantic_index WHERE asset_id = OLD.id AND asset_type = 'knowledge_base';
      RETURN OLD;
    ELSE
      -- 只在 user_id 不为 null 时同步
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO asset_semantic_index (
          user_id, asset_id, asset_type, name, description, 
          capabilities, slot_type, is_active, category
        ) VALUES (
          NEW.user_id, NEW.id, 'knowledge_base', NEW.name, NEW.description,
          NEW.intent_tags, 'perception', true, 'knowledge'
        )
        ON CONFLICT (asset_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          capabilities = EXCLUDED.capabilities,
          updated_at = now();
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  
  -- 对于技能
  IF TG_TABLE_NAME = 'skills' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM asset_semantic_index WHERE asset_id = OLD.id AND asset_type = 'skill';
      RETURN OLD;
    ELSE
      -- 只在 author_id 不为 null 时同步
      IF NEW.author_id IS NOT NULL THEN
        INSERT INTO asset_semantic_index (
          user_id, asset_id, asset_type, name, description,
          capabilities, slot_type, is_active, category
        ) VALUES (
          NEW.author_id, NEW.id, 'skill', NEW.name, NEW.description,
          NEW.tags, 'decision', true, NEW.category
        )
        ON CONFLICT (asset_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          capabilities = EXCLUDED.capabilities,
          category = EXCLUDED.category,
          updated_at = now();
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS sync_knowledge_base_to_index ON knowledge_bases;
DROP TRIGGER IF EXISTS sync_skill_to_index ON skills;

-- 创建知识库同步触发器
CREATE TRIGGER sync_knowledge_base_to_index
AFTER INSERT OR UPDATE OR DELETE ON knowledge_bases
FOR EACH ROW EXECUTE FUNCTION sync_asset_to_semantic_index();

-- 创建技能同步触发器
CREATE TRIGGER sync_skill_to_index
AFTER INSERT OR UPDATE OR DELETE ON skills
FOR EACH ROW EXECUTE FUNCTION sync_asset_to_semantic_index();