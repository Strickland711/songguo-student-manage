import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/hooks/useStudentData';
import { StudentFilterBar } from './StudentFilterBar';
import { StudentFeedbackCard } from './StudentFeedbackCard';
import { FeedbackGenerationDialog } from './FeedbackGenerationDialog';

/**
 * AI反馈话术生成器主组件
 * 功能：为每位学生生成个性化的家长沟通话术
 * AI会综合学生的标签、考试成绩等信息
 */
interface AIFeedbackScriptGeneratorProps {
  students: Student[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface StudentWithTags extends Student {
  tags?: Tag[];
}

export const AIFeedbackScriptGenerator = ({ students }: AIFeedbackScriptGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 状态管理
  const [studentsWithTags, setStudentsWithTags] = useState<StudentWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentWithTags | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  
  // 筛选状态
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  
  // AI参考信息选择状态
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [includeExams, setIncludeExams] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');

  /**
   * 加载学生数据和标签
   * 为每个学生加载其关联的所有标签
   */
  useEffect(() => {
    if (user) {
      loadStudentsWithData();
    }
  }, [user, students]);

  const loadStudentsWithData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 并行加载每个学生的标签数据
      const studentsWithTagsPromises = students.map(async (student) => {
        if (!student.id) return { ...student, tags: [] };

        // 查询学生-标签关联表
        const { data: studentTagsData } = await supabase
          .from('student_tags')
          .select('tag_id')
          .eq('student_id', student.id);

        if (!studentTagsData || studentTagsData.length === 0) {
          return { ...student, tags: [] };
        }

        // 查询标签详细信息
        const tagIds = studentTagsData.map(t => t.tag_id);
        const { data: tagsData } = await supabase
          .from('tags')
          .select('id, name, color')
          .in('id', tagIds);

        return { ...student, tags: tagsData || [] };
      });

      const result = await Promise.all(studentsWithTagsPromises);
      setStudentsWithTags(result);
    } catch (error: any) {
      console.error('加载学生数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取所有班级列表用于筛选
   */
  const allClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

  /**
   * 根据班级和姓名筛选学生
   */
  const filteredStudents = studentsWithTags.filter(student => {
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    const matchesName = !searchName || student.name.toLowerCase().includes(searchName.toLowerCase());
    return matchesClass && matchesName;
  });

  /**
   * 打开生成对话框
   * 初始化默认选中所有标签
   */
  const handleOpenDialog = (student: StudentWithTags) => {
    setCurrentStudent(student);
    setGeneratedScript('');
    setSelectedTagIds(student.tags?.map(t => t.id) || []);
    setIncludeExams(true);
    setCustomPrompt('');
    setShowDialog(true);
  };

  /**
   * 生成AI反馈话术
   * 收集选中的信息来源并调用AI生成
   */
  const handleGenerate = async () => {
    if (!currentStudent || !user) return;

    setIsGenerating(true);
    try {
      // 构建学生基本信息
      const studentInfo: any = {
        姓名: currentStudent.name,
        班级: currentStudent.class
      };

      let contextPrompt = '';

      // 1. 包含选中的标签信息
      if (selectedTagIds.length > 0 && currentStudent.tags && currentStudent.tags.length > 0) {
        const selectedTags = currentStudent.tags.filter(t => selectedTagIds.includes(t.id));
        if (selectedTags.length > 0) {
          const tagNames = selectedTags.map(t => t.name).join('、');
          contextPrompt += `学生标签：${tagNames}\n`;
        }
      }

      // 2. 包含考试成绩（近5次）
      if (includeExams) {
        const { data: examResults } = await supabase
          .from('exam_results')
          .select('*, exams(name)')
          .eq('student_id', currentStudent.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (examResults && examResults.length > 0) {
          contextPrompt += '\n近期考试成绩：\n';
          examResults.forEach((result: any) => {
            contextPrompt += `- ${result.exams?.name || '考试'}：${result.total_score}分（正确${result.correct_count}题）\n`;
          });
        }
      }

      // 3. 添加自定义提示
      if (customPrompt.trim()) {
        contextPrompt += `\n教师备注：${customPrompt}\n`;
      }

      // 验证是否有可用信息
      if (!contextPrompt.trim()) {
        toast({
          title: '无可用信息',
          description: '请至少选择一项信息来源，或填写自定义提示',
          variant: 'default',
        });
        return;
      }

      // 构建AI提示词
      const finalPrompt = `请根据以下学生信息，生成一段适合与家长沟通的反馈话术。话术要求：语言亲切、专业，既要指出优点，也要委婉地提出改进建议，长度控制在150-250字。

${contextPrompt}`;

      // 调用AI生成
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-feedback', {
        body: {
          prompt: finalPrompt,
          studentInfo
        }
      });

      if (aiError) throw aiError;

      if (aiData?.feedback) {
        setGeneratedScript(aiData.feedback);
        toast({
          title: '生成成功',
          description: 'AI已生成反馈话术',
        });
      } else {
        throw new Error('AI返回数据格式错误');
      }
    } catch (error: any) {
      console.error('AI生成失败:', error);
      toast({
        title: 'AI生成失败',
        description: error.message || '生成反馈时发生错误，请重试',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 复制生成的话术到剪贴板
   */
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    toast({
      title: '已复制',
      description: '反馈话术已复制到剪贴板',
    });
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-primary">AI反馈话术生成</h2>
        <p className="text-sm text-muted-foreground mt-1">
          为每位学生生成个性化的家长沟通话术，AI会综合学生的标签、成绩、评分等信息
        </p>
      </div>

      {/* 筛选栏 */}
      <StudentFilterBar
        filterClass={filterClass}
        searchName={searchName}
        allClasses={allClasses}
        onFilterClassChange={setFilterClass}
        onSearchNameChange={setSearchName}
      />

      {/* 学生列表 */}
      <div className="grid gap-4">
        {filteredStudents.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">暂无学生</h3>
                <p className="text-sm text-muted-foreground mt-2">请先在学生管理中添加学生</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map(student => (
            <StudentFeedbackCard
              key={student.id}
              student={student}
              onGenerateClick={() => handleOpenDialog(student)}
            />
          ))
        )}
      </div>

      {/* 生成对话框 */}
      <FeedbackGenerationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        studentName={currentStudent?.name || ''}
        studentTags={currentStudent?.tags}
        selectedTagIds={selectedTagIds}
        includeExams={includeExams}
        customPrompt={customPrompt}
        generatedScript={generatedScript}
        isGenerating={isGenerating}
        onSelectedTagsChange={setSelectedTagIds}
        onIncludeExamsChange={setIncludeExams}
        onCustomPromptChange={setCustomPrompt}
        onGenerate={handleGenerate}
        onCopy={handleCopy}
      />
    </div>
  );
};
