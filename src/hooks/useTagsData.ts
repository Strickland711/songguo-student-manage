import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Tag {
  id?: string;
  name: string;
  color: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTag {
  id?: string;
  student_id: string;
  tag_id: string;
  created_at?: string;
}

export interface TagWithStudentCount extends Tag {
  student_count: number;
}

export const useTagsData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagWithStudentCount[]>([]);
  const [studentTags, setStudentTags] = useState<StudentTag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTagsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load tags with student count
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select(`
          *,
          student_tags(count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (tagsError) throw tagsError;

      // Load all student-tag relationships
      const { data: studentTagsData, error: studentTagsError } = await supabase
        .from('student_tags')
        .select(`
          *,
          students!inner(user_id)
        `)
        .eq('students.user_id', user.id);

      if (studentTagsError) throw studentTagsError;

      // Process tags with student count
      const processedTags: TagWithStudentCount[] = tagsData.map(tag => ({
        ...tag,
        student_count: Array.isArray(tag.student_tags) ? tag.student_tags.length : 0
      }));

      setTags(processedTags);
      setStudentTags(studentTagsData);
    } catch (error: any) {
      console.error('Failed to load tags data:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载标签数据失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (tag: Omit<Tag, 'id'>) => {
    if (!user) return;

    try {
      // Check if tag with same name already exists
      const { data: existingTag, error: checkError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', tag.name)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTag) {
        toast({
          title: "标签已存在",
          description: `标签 "${tag.name}" 已经存在`,
          variant: "destructive",
        });
        return null;
      }

      const tagWithUserId = {
        ...tag,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('tags')
        .insert(tagWithUserId)
        .select()
        .single();

      if (error) throw error;

      await loadTagsData();
      
      toast({
        title: "创建成功",
        description: "标签已创建",
      });

      return data;
    } catch (error: any) {
      console.error('Failed to create tag:', error);
      toast({
        title: "创建失败",
        description: error.message || "创建标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTag = async (tagId: string, updates: Partial<Tag>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', tagId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      await loadTagsData();
      
      toast({
        title: "更新成功",
        description: "标签已更新",
      });

      return data;
    } catch (error: any) {
      console.error('Failed to update tag:', error);
      toast({
        title: "更新失败",
        description: error.message || "更新标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!user) return;

    try {
      // Delete all student-tag relationships first
      const { error: relationError } = await supabase
        .from('student_tags')
        .delete()
        .eq('tag_id', tagId);

      if (relationError) throw relationError;

      // Delete the tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadTagsData();
      
      toast({
        title: "删除成功",
        description: "标签已删除",
      });
    } catch (error: any) {
      console.error('Failed to delete tag:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const assignTagToStudent = async (studentId: string, tagId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('student_tags')
        .insert({
          student_id: studentId,
          tag_id: tagId
        })
        .select();

      if (error) throw error;

      await loadTagsData();
      return data[0];
    } catch (error: any) {
      console.error('Failed to assign tag:', error);
      toast({
        title: "分配失败",
        description: error.message || "分配标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeTagFromStudent = async (studentId: string, tagId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('student_tags')
        .delete()
        .eq('student_id', studentId)
        .eq('tag_id', tagId);

      if (error) throw error;

      await loadTagsData();
    } catch (error: any) {
      console.error('Failed to remove tag:', error);
      toast({
        title: "移除失败",
        description: error.message || "移除标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getStudentTags = (studentId: string) => {
    return studentTags.filter(st => st.student_id === studentId);
  };

  const mergeTags = async (sourceTagId: string, targetTagId: string, keepTargetData: boolean = true) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('merge_tags', {
        source_tag_id: sourceTagId,
        target_tag_id: targetTagId,
        keep_target_data: keepTargetData
      });

      if (error) throw error;

      await loadTagsData();
      
      toast({
        title: "合并成功",
        description: "标签已成功合并",
      });

      return data;
    } catch (error: any) {
      console.error('Failed to merge tags:', error);
      toast({
        title: "合并失败",
        description: error.message || "合并标签失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const findOrCreateTagByName = async (tagName: string, tagColor?: string) => {
    if (!user) return;

    try {
      // First try to find existing tag
      const { data: existingTag, error: findError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', tagName)
        .maybeSingle();

      if (findError) throw findError;

      if (existingTag) {
        return existingTag;
      }

      // Create new tag if not exists
      return await createTag({
        name: tagName,
        color: tagColor || '#3B82F6',
        description: ''
      });
    } catch (error: any) {
      console.error('Failed to find or create tag:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      loadTagsData();
    }
  }, [user]);

  return {
    tags,
    studentTags,
    loading,
    createTag,
    updateTag,
    deleteTag,
    assignTagToStudent,
    removeTagFromStudent,
    getStudentTags,
    mergeTags,
    findOrCreateTagByName,
    loadTagsData
  };
};