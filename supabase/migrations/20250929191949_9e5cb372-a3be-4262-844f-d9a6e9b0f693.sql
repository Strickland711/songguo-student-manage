-- 创建反馈话术模板表
CREATE TABLE public.feedback_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tag_field_name TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag_field_name, tag_value)
);

-- 启用 RLS
ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own feedback templates"
  ON public.feedback_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback templates"
  ON public.feedback_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback templates"
  ON public.feedback_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback templates"
  ON public.feedback_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- 更新时间触发器
CREATE TRIGGER update_feedback_templates_updated_at
  BEFORE UPDATE ON public.feedback_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();