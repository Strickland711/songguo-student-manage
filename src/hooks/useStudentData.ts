import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Student {
  id: string;
  name: string;
  class: string;
  [key: string]: any;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email';
}

export interface ScoringRecord {
  id: string;
  student_id: string;
  category: string;
  score: number;
  notes?: string;
}

export const useStudentData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data from database
  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (studentsError) throw studentsError;

      // Load custom fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fieldsError) throw fieldsError;

      // Load student field values
      const { data: valuesData, error: valuesError } = await supabase
        .from('student_field_values')
        .select(`
          student_id,
          field_id,
          value,
          custom_fields!inner(name)
        `);

      if (valuesError) throw valuesError;

      // Combine student data with their custom field values
      const studentsWithFields: Student[] = (studentsData || []).map(student => {
        const studentFieldValues = (valuesData || []).filter(
          value => value.student_id === student.id
        );
        
        const customFieldData: any = {};
        studentFieldValues.forEach(value => {
          if (value.custom_fields?.name) {
            customFieldData[value.custom_fields.name] = value.value;
          }
        });

        return {
          ...student,
          ...customFieldData
        };
      });

      setStudents(studentsWithFields);
      setCustomFields((fieldsData || []).map(field => ({
        ...field,
        type: field.type as 'text' | 'number' | 'date' | 'email'
      })));
    } catch (error: any) {
      toast({
        title: "加载数据失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save students to database
  const saveStudents = async (newStudents: Student[]) => {
    if (!user) return;

    try {
      // Extract base student data (without custom fields)
      const studentsToSave = newStudents.map(student => ({
        id: student.id,
        user_id: user.id,
        name: student.name,
        class: student.class
      }));

      // Upsert students
      const { error: studentsError } = await supabase
        .from('students')
        .upsert(studentsToSave, { onConflict: 'id' });

      if (studentsError) throw studentsError;

      // Handle custom field values
      for (const student of newStudents) {
        for (const field of customFields) {
          if (student[field.name] !== undefined) {
            const { error: valueError } = await supabase
              .from('student_field_values')
              .upsert({
                student_id: student.id,
                field_id: field.id,
                value: student[field.name]
              }, { onConflict: 'student_id,field_id' });

            if (valueError) throw valueError;
          }
        }
      }

      setStudents(newStudents);
      
      toast({
        title: "保存成功",
        description: "学生数据已保存到数据库",
      });
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Save custom fields to database
  const saveCustomFields = async (newFields: CustomField[]) => {
    if (!user) return;

    try {
      const fieldsToSave = newFields.map(field => ({
        ...field,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('custom_fields')
        .upsert(fieldsToSave, { onConflict: 'id' });

      if (error) throw error;

      setCustomFields(newFields);
    } catch (error: any) {
      toast({
        title: "保存字段失败",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete student from database
  const deleteStudent = async (studentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== studentId));
      
      toast({
        title: "删除成功",
        description: "学生信息已删除",
      });
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Delete custom field from database
  const deleteCustomField = async (fieldId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      // Remove field from local state
      const fieldName = customFields.find(f => f.id === fieldId)?.name;
      setCustomFields(prev => prev.filter(f => f.id !== fieldId));
      
      if (fieldName) {
        setStudents(prev => prev.map(student => {
          const { [fieldName]: removed, ...rest } = student;
          return rest as Student;
        }));
      }

      toast({
        title: "字段删除成功",
        description: "自定义字段已删除",
      });
    } catch (error: any) {
      toast({
        title: "删除字段失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Save scoring record
  const saveScoringRecord = async (record: Omit<ScoringRecord, 'id'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scoring_records')
        .insert({
          ...record,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "评分保存成功",
        description: "评分记录已保存到数据库",
      });
    } catch (error: any) {
      toast({
        title: "评分保存失败",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  return {
    students,
    customFields,
    loading,
    setStudents,
    setCustomFields,
    saveStudents,
    saveCustomFields,
    deleteStudent,
    deleteCustomField,
    saveScoringRecord,
    loadData
  };
};