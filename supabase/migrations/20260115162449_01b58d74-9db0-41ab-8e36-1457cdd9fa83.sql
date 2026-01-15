-- 首先为 asset_id 添加唯一约束（使用 ADD CONSTRAINT）
ALTER TABLE asset_semantic_index ADD CONSTRAINT asset_semantic_index_asset_id_key UNIQUE (asset_id);