import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Copy, Users, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/hooks/useStudentData';

interface AIFeedbackScriptGeneratorProps {
  students: Student[];
}

interface StudentWithTags extends Student {
  tags?: Array<{ id: string; name: string; color: string }>;
}

const AIFeedbackScriptGenerator = ({ students }: AIFeedbackScriptGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentsWithTags, setStudentsWithTags] = useState<StudentWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentWithTags | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');

  // 勾选项状态
  const [includeTags, setIncludeTags] = useState(true);
  const [includeExams, setIncludeExams] = useState(true);
  const [includeScores, setIncludeScores] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    if (user) {
      loadStudentsWithData();
    }
  }, [user, students]);

  const loadStudentsWithData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 为每个学生加载标签
      const studentsWithTagsPromises = students.map(async (student) => {
        if (!student.id) return { ...student, tags: [] };

        const { data: studentTagsData } = await supabase
          .from('student_tags')
          .select('tag_id')
          .eq('student_id', student.id);

        if (!studentTagsData || studentTagsData.length === 0) {
          return { ...student, tags: [] };
        }

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

  // 获取所有班级用于筛选
  const allClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();

  // 筛选学生
  const filteredStudents = studentsWithTags.filter(student => {
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    const matchesName = !searchName || student.name.toLowerCase().includes(searchName.toLowerCase());
    return matchesClass && matchesName;
  });

  const handleOpenDialog = (student: StudentWithTags) => {
    setCurrentStudent(student);
    setGeneratedScript('');
    setIncludeTags(true);
    setIncludeExams(true);
    setIncludeScores(true);
    setCustomPrompt('');
    setShowDialog(true);
  };

  const handleGenerate = async () => {
    if (!currentStudent || !user) return;

    setIsGenerating(true);
    try {
      // 收集学生信息
      const studentInfo: any = {
        姓名: currentStudent.name,
        班级: currentStudent.class
      };

      let contextPrompt = '';

      // 1. 包含标签信息
      if (includeTags && currentStudent.tags && currentStudent.tags.length > 0) {
        const tagNames = currentStudent.tags.map(t => t.name).join('、');
        contextPrompt += `学生标签：${tagNames}\n`;
      }

      // 2. 包含考试成绩
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

      // 3. 包含评分记录
      if (includeScores) {
        const { data: scoringRecords } = await supabase
          .from('scoring_records')
          .select('*')
          .eq('student_id', currentStudent.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (scoringRecords && scoringRecords.length > 0) {
          contextPrompt += '\n近期评分记录：\n';
          const categoryScores: Record<string, number[]> = {};
          scoringRecords.forEach((record: any) => {
            if (!categoryScores[record.category]) {
              categoryScores[record.category] = [];
            }
            categoryScores[record.category].push(Number(record.score));
          });

          Object.entries(categoryScores).forEach(([category, scores]) => {
            const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
            contextPrompt += `- ${category}：平均${avg}分（共${scores.length}次记录）\n`;
          });
        }
      }

      // 4. 添加自定义提示
      if (customPrompt.trim()) {
        contextPrompt += `\n教师备注：${customPrompt}\n`;
      }

      if (!contextPrompt.trim()) {
        toast({
          title: '无可用信息',
          description: '请至少选择一项信息来源，或填写自定义提示',
          variant: 'default',
        });
        return;
      }

      // 调用AI生成
      const finalPrompt = `请根据以下学生信息，生成一段适合与家长沟通的反馈话术。话术要求：语言亲切、专业，既要指出优点，也要委婉地提出改进建议，长度控制在150-250字。

${contextPrompt}`;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    toast({
      title: '已复制',
      description: '反馈话术已复制到剪贴板',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">AI反馈话术生成</h2>
        <p className="text-sm text-muted-foreground mt-1">
          为每位学生生成个性化的家长沟通话术，AI会综合学生的标签、成绩、评分等信息
        </p>
      </div>

      {/* 筛选栏 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-accent" />
            筛选学生
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班级</SelectItem>
                {allClasses.map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="搜索学生姓名..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

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
            <Card key={student.id} className="shadow-card hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{student.name}</h3>
                      <Badge variant="secondary">{student.class}</Badge>
                    </div>
                    {student.tags && student.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {student.tags.map(tag => (
                          <Badge 
                            key={tag.id} 
                            variant="outline"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleOpenDialog(student)}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成话术
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 生成对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              为 {currentStudent?.name} 生成反馈话术
            </DialogTitle>
            <DialogDescription>
              选择AI要参考的信息来源，生成个性化的家长沟通话术
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* 信息来源选择 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">AI参考信息</Label>
                
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox 
                    id="include-tags" 
                    checked={includeTags}
                    onCheckedChange={(checked) => setIncludeTags(checked as boolean)}
                  />
                  <label
                    htmlFor="include-tags"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    学生标签
                    {currentStudent?.tags && currentStudent.tags.length > 0 && (
                      <span className="text-muted-foreground ml-2">
                        （{currentStudent.tags.length}个标签）
                      </span>
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox 
                    id="include-exams" 
                    checked={includeExams}
                    onCheckedChange={(checked) => setIncludeExams(checked as boolean)}
                  />
                  <label
                    htmlFor="include-exams"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    考试成绩记录
                    <span className="text-muted-foreground ml-2">（近5次考试）</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox 
                    id="include-scores" 
                    checked={includeScores}
                    onCheckedChange={(checked) => setIncludeScores(checked as boolean)}
                  />
                  <label
                    htmlFor="include-scores"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    评分记录
                    <span className="text-muted-foreground ml-2">（近10次评分）</span>
                  </label>
                </div>
              </div>

              {/* 自定义提示 */}
              <div>
                <Label htmlFor="custom-prompt">自定义提示（可选）</Label>
                <Textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="添加额外的提示信息，例如：重点关注学生的课堂参与度、需要鼓励学生多发言..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* 生成的话术 */}
              {generatedScript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">生成的话术</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      <Copy className="w-3 h-3" />
                      复制
                    </Button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">{generatedScript}</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              关闭
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || (!includeTags && !includeExams && !includeScores && !customPrompt.trim())}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成话术
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIFeedbackScriptGenerator;
