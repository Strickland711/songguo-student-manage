-- 为自定义字段表添加公式支持
-- 添加公式字段存储计算表达式
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS formula text;

-- 添加公式依赖字段，存储依赖的字段ID数组
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS formula_dependencies jsonb DEFAULT '[]'::jsonb;

-- 添加注释
COMMENT ON COLUMN public.custom_fields.formula IS '公式表达式，用于计算字段值';
COMMENT ON COLUMN public.custom_fields.formula_dependencies IS '公式依赖的字段ID数组';