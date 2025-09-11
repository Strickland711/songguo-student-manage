-- 添加数据库索引以提高查询性能

-- 为 students 表添加索引
CREATE INDEX IF NOT EXISTS idx_students_user_id_class ON students(user_id, class);
CREATE INDEX IF NOT EXISTS idx_students_user_id_name ON students(user_id, name);

-- 为 custom_fields 表添加索引  
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_fields(user_id);

-- 为 student_field_values 表添加索引
CREATE INDEX IF NOT EXISTS idx_student_field_values_student_field ON student_field_values(student_id, field_id);
CREATE INDEX IF NOT EXISTS idx_student_field_values_student_id ON student_field_values(student_id);
CREATE INDEX IF NOT EXISTS idx_student_field_values_field_id ON student_field_values(field_id);