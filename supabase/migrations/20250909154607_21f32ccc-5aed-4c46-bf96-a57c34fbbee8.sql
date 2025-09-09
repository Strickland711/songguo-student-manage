-- 添加exam_results表的唯一约束，确保一个学生一次考试只能有一个成绩
ALTER TABLE public.exam_results 
ADD CONSTRAINT exam_results_exam_id_student_id_key 
UNIQUE (exam_id, student_id);