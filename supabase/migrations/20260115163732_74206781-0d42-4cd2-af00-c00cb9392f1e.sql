-- 修改 agent_evaluations 表，允许 agent_id 为 NULL
-- 这样可以在智能体尚未保存到数据库时也能保存评估结果

-- 1. 先移除外键约束
ALTER TABLE agent_evaluations 
DROP CONSTRAINT IF EXISTS agent_evaluations_agent_id_fkey;

-- 2. 将 agent_id 字段改为可选（允许 NULL）
ALTER TABLE agent_evaluations 
ALTER COLUMN agent_id DROP NOT NULL;