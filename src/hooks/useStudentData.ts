import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Student {
  id?: string;
  name: string;
  class: string;
  [key: string]: any;
}

export interface CustomField {
  id?: string;
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
      // Separate existing students (with id) from new students (without id)
      const existingStudents = newStudents.filter(student => student.id);
      const newStudentsWithoutId = newStudents.filter(student => !student.id);

      // Insert new students and get their generated IDs
      const insertedStudents = [];
      if (newStudentsWithoutId.length > 0) {
        const studentsToInsert = newStudentsWithoutId.map(student => ({
          user_id: user.id,
          name: student.name,
          class: student.class
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('students')
          .insert(studentsToInsert)
          .select();

        if (insertError) throw insertError;
        insertedStudents.push(...(insertedData || []));
      }

      // Update existing students
      if (existingStudents.length > 0) {
        const studentsToUpdate = existingStudents.map(student => ({
          id: student.id,
          user_id: user.id,
          name: student.name,
          class: student.class
        }));

        const { error: updateError } = await supabase
          .from('students')
          .upsert(studentsToUpdate, { onConflict: 'id' });

        if (updateError) throw updateError;
      }

      // Combine all students with their correct IDs
      const allSavedStudents = [
        ...existingStudents,
        ...insertedStudents.map((inserted, index) => ({
          ...newStudentsWithoutId[index],
          id: inserted.id
        }))
      ];

      // 重新获取最新的自定义字段数据（包含正确的ID）
      const { data: latestFields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('user_id', user.id);

      const fieldsToUse = latestFields || customFields;

      // Handle custom field values
      for (const student of allSavedStudents) {
        for (const field of fieldsToUse) {
          if (student[field.name] !== undefined && student[field.name] !== '') {
            const { error: valueError } = await supabase
              .from('student_field_values')
              .upsert({
                student_id: student.id,
                field_id: field.id,
                value: student[field.name]
              }, { onConflict: 'student_id,field_id' });

            if (valueError) {
              console.error('保存自定义字段值失败:', valueError);
              throw valueError;
            }
          }
        }
      }

      setStudents(allSavedStudents);
      
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
      // Separate existing fields (with id) from new fields (without id)
      const existingFields = newFields.filter(field => field.id);
      const newFieldsWithoutId = newFields.filter(field => !field.id);

      // Insert new fields and get their generated IDs
      const insertedFields = [];
      if (newFieldsWithoutId.length > 0) {
        const fieldsToInsert = newFieldsWithoutId.map(field => ({
          user_id: user.id,
          name: field.name,
          type: field.type
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('custom_fields')
          .insert(fieldsToInsert)
          .select();

        if (insertError) throw insertError;
        insertedFields.push(...(insertedData || []));
      }

      // Update existing fields
      if (existingFields.length > 0) {
        const fieldsToUpdate = existingFields.map(field => ({
          id: field.id,
          user_id: user.id,
          name: field.name,
          type: field.type
        }));

        const { error: updateError } = await supabase
          .from('custom_fields')
          .upsert(fieldsToUpdate, { onConflict: 'id' });

        if (updateError) throw updateError;
      }

      // Combine all fields with their correct IDs
      const allSavedFields = [
        ...existingFields,
        ...insertedFields.map((inserted, index) => ({
          ...newFieldsWithoutId[index],
          id: inserted.id
        }))
      ];

      setCustomFields(allSavedFields);
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