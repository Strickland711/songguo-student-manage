import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FeedbackRecord {
  id?: string;
  student_id: string;
  feedback_date: string;
  mood: 'happy' | 'neutral' | 'sad';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackWithStudent extends FeedbackRecord {
  student_name: string;
  student_class: string;
}

export const useFeedbackData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsMap, setStudentsMap] = useState<Map<string, any>>(new Map());

  const loadFeedbackData = async (limit?: number) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // 先加载学生信息（通常数量不多，可以一次性加载）
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class')
        .eq('user_id', user.id);

      if (studentsError) throw studentsError;
      
      // 创建学生ID到学生信息的映射
      const studentMap = new Map(studentsData.map(student => [student.id, student]));
      setStudentsMap(studentMap);

      // 获取反馈记录 - 优化：限制加载数量，只加载最近的记录
      let query = supabase
        .from('feedback_records')
        .select('*')
        .eq('user_id', user.id)
        .order('feedback_date', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }

      const { data: feedbackData, error: feedbackError } = await query;

      if (feedbackError) throw feedbackError;

      // 合并数据
      const feedbackWithStudents: FeedbackWithStudent[] = feedbackData.map(record => {
        const student = studentMap.get(record.student_id);
        return {
          id: record.id,
          student_id: record.student_id,
          feedback_date: record.feedback_date,
          mood: record.mood as 'happy' | 'neutral' | 'sad',
          notes: record.notes,
          created_at: record.created_at,
          updated_at: record.updated_at,
          student_name: student?.name || '',
          student_class: student?.class || ''
        };
      });

      setFeedbackRecords(feedbackWithStudents);
    } catch (error: any) {
      console.error('Failed to load feedback data:', error);
      toast({
        title: "加载失败",
        description: error.message || "加载反馈数据失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFeedbackRecord = async (record: Omit<FeedbackRecord, 'id'>) => {
    if (!user) return;

    try {
      const recordWithUserId = {
        ...record,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('feedback_records')
        .upsert(recordWithUserId, {
          onConflict: 'user_id,student_id,feedback_date'
        })
        .select();

      if (error) throw error;

      // 重新加载数据以更新界面
      await loadFeedbackData();
      
      toast({
        title: "保存成功",
        description: "反馈记录已保存",
      });

      return data[0];
    } catch (error: any) {
      console.error('Failed to save feedback record:', error);
      toast({
        title: "保存失败",
        description: error.message || "保存失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFeedbackRecord = async (recordId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('feedback_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', user.id);

      if (error) throw error;

      // 重新加载数据以更新界面
      await loadFeedbackData();
      
      toast({
        title: "删除成功",
        description: "反馈记录已删除",
      });
    } catch (error: any) {
      console.error('Failed to delete feedback record:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getFeedbackByDate = (date: string) => {
    return feedbackRecords.filter(record => record.feedback_date === date);
  };

  const getFeedbackByStudent = (studentId: string) => {
    return feedbackRecords.filter(record => record.student_id === studentId);
  };

  const getFeedbackByStudentIds = (studentIds: string[]) => {
    return feedbackRecords.filter(record => studentIds.includes(record.student_id));
  };

  useEffect(() => {
    if (user) {
      // 初始加载只加载最近 200 条记录，提高加载速度
      loadFeedbackData(200);
    }
  }, [user]);

  return {
    feedbackRecords,
    loading,
    saveFeedbackRecord,
    deleteFeedbackRecord,
    getFeedbackByDate,
    getFeedbackByStudent,
    getFeedbackByStudentIds,
    loadFeedbackData
  };
};