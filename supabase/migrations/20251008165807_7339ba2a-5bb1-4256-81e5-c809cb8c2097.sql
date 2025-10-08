-- 为tags表添加AI提示词字段
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS ai_prompt text,
ADD COLUMN IF NOT EXISTS use_for_feedback boolean DEFAULT false;

COMMENT ON COLUMN tags.ai_prompt IS 'AI生成反馈话术的提示词';
COMMENT ON COLUMN tags.use_for_feedback IS '是否将此标签用于生成反馈话术';

-- 删除旧的feedback_templates表（如果不再需要）
-- 注释掉以防用户还需要历史数据
-- DROP TABLE IF EXISTS feedback_templates CASCADE;