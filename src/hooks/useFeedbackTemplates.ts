import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FeedbackTemplate {
  id?: string;
  user_id?: string;
  name: string;
  tag_field_name: string;
  tag_value: string;
  template: string;
  ai_prompt?: string;
  use_ai?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useFeedbackTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载话术模板失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Omit<FeedbackTemplate, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      const templateData = {
        ...template,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('feedback_templates')
        .upsert(templateData, {
          onConflict: 'user_id,tag_field_name,tag_value'
        })
        .select()
        .single();

      if (error) throw error;

      await loadTemplates();
      
      toast({
        title: "保存成功",
        description: "话术模板已保存",
      });

      return data;
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast({
        title: "保存失败",
        description: error.message || "保存模板失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('feedback_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadTemplates();
      
      toast({
        title: "删除成功",
        description: "话术模板已删除",
      });
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除模板失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getTemplateForStudent = (student: any, fieldName: string) => {
    const fieldValue = student[fieldName];
    if (!fieldValue) return null;

    return templates.find(
      t => t.tag_field_name === fieldName && t.tag_value === fieldValue
    );
  };

  const generateWithAI = async (template: FeedbackTemplate, student: any) => {
    if (!template.use_ai || !template.ai_prompt) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-feedback', {
        body: {
          prompt: template.ai_prompt,
          studentInfo: {
            姓名: student.name,
            班级: student.class,
            ...Object.keys(student)
              .filter(key => !['id', 'user_id', 'created_at', 'updated_at', 'name', 'class'].includes(key))
              .reduce((obj, key) => ({ ...obj, [key]: student[key] }), {})
          }
        }
      });

      if (error) throw error;
      return data.feedback;
    } catch (error: any) {
      console.error('AI generation failed:', error);
      toast({
        title: "AI生成失败",
        description: error.message || "请重试或使用固定模板",
        variant: "destructive",
      });
      return null;
    }
  };

  const renderTemplate = (template: string, student: any) => {
    let rendered = template;
    
    // 替换基本字段
    rendered = rendered.replace(/\{姓名\}/g, student.name || '');
    rendered = rendered.replace(/\{班级\}/g, student.class || '');
    
    // 替换自定义字段 - 匹配 {字段名} 格式
    const fieldMatches = template.match(/\{([^}]+)\}/g);
    if (fieldMatches) {
      fieldMatches.forEach(match => {
        const fieldName = match.slice(1, -1); // 去掉 { }
        if (fieldName !== '姓名' && fieldName !== '班级' && student[fieldName]) {
          rendered = rendered.replace(new RegExp(match, 'g'), student[fieldName]);
        }
      });
    }
    
    return rendered;
  };

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    getTemplateForStudent,
    renderTemplate,
    generateWithAI,
    loadTemplates
  };
};
