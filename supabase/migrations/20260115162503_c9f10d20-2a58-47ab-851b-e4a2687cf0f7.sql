-- 回填现有知识库数据（过滤掉 user_id 为 null 的记录）
INSERT INTO asset_semantic_index (user_id, asset_id, asset_type, name, description, capabilities, slot_type, is_active, category)
SELECT user_id, id, 'knowledge_base', name, description, intent_tags, 'perception', true, 'knowledge'
FROM knowledge_bases
WHERE user_id IS NOT NULL
ON CONFLICT (asset_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  updated_at = now();

-- 回填现有技能数据（过滤掉 author_id 为 null 的记录）
INSERT INTO asset_semantic_index (user_id, asset_id, asset_type, name, description, capabilities, slot_type, is_active, category)
SELECT author_id, id, 'skill', name, description, tags, 'decision', true, category
FROM skills
WHERE author_id IS NOT NULL
ON CONFLICT (asset_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  category = EXCLUDED.category,
  updated_at = now();