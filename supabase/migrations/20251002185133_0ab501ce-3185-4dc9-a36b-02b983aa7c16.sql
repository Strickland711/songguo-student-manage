-- 修改feedback_templates表结构，添加AI提示词字段
ALTER TABLE feedback_templates 
ADD COLUMN IF NOT EXISTS ai_prompt text,
ADD COLUMN IF NOT EXISTS use_ai boolean DEFAULT false;

-- 添加注释说明
COMMENT ON COLUMN feedback_templates.ai_prompt IS 'AI生成反馈话术的提示词模板';
COMMENT ON COLUMN feedback_templates.use_ai IS '是否使用AI生成反馈话术';
COMMENT ON COLUMN feedback_templates.template IS '固定模板或AI生成的示例（当use_ai=true时作为参考）';