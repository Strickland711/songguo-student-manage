import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ClassroomSession {
  id: string;
  user_id: string;
  class_name: string;
  lesson_title: string;
  lesson_date: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  homework_completed: boolean;
  homework_notes?: string;
  listening_score?: number;
  listening_notes?: string;
  check_in_time?: string;
  created_at: string;
  updated_at: string;
}

export const useClassroomData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('lesson_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "加载失败",
        description: "无法加载课堂记录",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceRecords = async (sessionId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      setAttendanceRecords(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading attendance records:', error);
      toast({
        title: "加载失败",
        description: "无法加载考勤记录",
        variant: "destructive",
      });
      return [];
    }
  };

  const createSession = async (sessionData: Omit<ClassroomSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .insert([{ ...sessionData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "创建成功",
        description: "课堂记录已创建",
      });
      
      await loadSessions();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "创建失败",
        description: "无法创建课堂记录",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<ClassroomSession>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('classroom_sessions')
        .update(updates)
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: "更新成功",
        description: "课堂记录已更新",
      });
      
      await loadSessions();
      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "更新失败",
        description: "无法更新课堂记录",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('classroom_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: "删除成功",
        description: "课堂记录已删除",
      });
      
      await loadSessions();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "删除失败",
        description: "无法删除课堂记录",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert([record], { onConflict: 'session_id,student_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving attendance record:', error);
      toast({
        title: "保存失败",
        description: "无法保存考勤记录",
        variant: "destructive",
      });
      return null;
    }
  };

  const batchSaveAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, { onConflict: 'session_id,student_id' });

      if (error) throw error;
      
      toast({
        title: "保存成功",
        description: "考勤记录已保存",
      });
      
      return true;
    } catch (error) {
      console.error('Error batch saving attendance records:', error);
      toast({
        title: "保存失败",
        description: "无法保存考勤记录",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  return {
    sessions,
    attendanceRecords,
    loading,
    loadSessions,
    loadAttendanceRecords,
    createSession,
    updateSession,
    deleteSession,
    saveAttendanceRecord,
    batchSaveAttendanceRecords,
  };
};
