import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Copy, RefreshCw, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/hooks/useStudentData';

interface Tag {
  id: string;
  name: string;
  color: string;
  ai_prompt?: string;
  use_for_feedback?: boolean;
}

interface StudentTag {
  tag_id: string;
  tags: Tag;
}

interface AIFeedbackGeneratorProps {
  students: Student[];
  onClose?: () => void;
}

const AIFeedbackGenerator = ({ students, onClose }: AIFeedbackGeneratorProps) => {
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [generatedFeedback, setGeneratedFeedback] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentTags, setStudentTags] = useState<Tag[]>([]);

  const handleSelectStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setGeneratedFeedback('');
    
    // 获取学生的标签
    const { data, error } = await supabase
      .from('student_tags')
      .select('tag_id, tags(*)')
      .eq('student_id', studentId);

    if (error) {
      console.error('Failed to load student tags:', error);
      return;
    }

    const tags = (data as unknown as StudentTag[])
      .map(st => st.tags)
      .filter(tag => tag.use_for_feedback && tag.ai_prompt);
    
    setStudentTags(tags);
  };

  const handleGenerateFeedback = async () => {
    if (!selectedStudentId || studentTags.length === 0) {
      toast({
        title: "无法生成",
        description: "请选择学生并确保该学生至少有一个配置了AI提示词的标签",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const student = students.find(s => s.id === selectedStudentId);
    
    try {
      // 合并所有标签的提示词
      const combinedPrompt = studentTags
        .map(tag => `[${tag.name}标签提示词]: ${tag.ai_prompt}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-feedback', {
        body: {
          prompt: combinedPrompt,
          studentInfo: {
            姓名: student?.name,
            班级: student?.class,
            标签: studentTags.map(t => t.name).join('、'),
            ...Object.keys(student || {})
              .filter(key => !['id', 'user_id', 'created_at', 'updated_at', 'name', 'class'].includes(key))
              .reduce((obj, key) => ({ ...obj, [key]: student?.[key] }), {})
          }
        }
      });

      if (error) throw error;
      setGeneratedFeedback(data.feedback);
      
      toast({
        title: "生成成功",
        description: "AI反馈话术已生成",
      });
    } catch (error: any) {
      console.error('Failed to generate feedback:', error);
      toast({
        title: "生成失败",
        description: error.message || "请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyFeedback = () => {
    navigator.clipboard.writeText(generatedFeedback);
    toast({
      title: "已复制",
      description: "反馈话术已复制到剪贴板",
    });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* 学生选择 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              选择学生
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {students.map(student => (
                  <Button
                    key={student.id}
                    variant={selectedStudentId === student.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleSelectStudent(student.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs opacity-75">{student.class}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 反馈生成 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI反馈生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStudent ? (
              <>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">当前学生: {selectedStudent.name}</p>
                  <p className="text-xs text-muted-foreground">班级: {selectedStudent.class}</p>
                  {studentTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {studentTags.map(tag => (
                        <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-destructive mt-2">
                      该学生没有配置AI提示词的标签
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleGenerateFeedback}
                  disabled={isGenerating || studentTags.length === 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成反馈话术
                    </>
                  )}
                </Button>

                {generatedFeedback && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">生成结果</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyFeedback}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制
                      </Button>
                    </div>
                    <Textarea
                      value={generatedFeedback}
                      onChange={(e) => setGeneratedFeedback(e.target.value)}
                      rows={10}
                      className="resize-none"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <p>请先选择一个学生</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="text-sm font-medium mb-2">💡 使用说明</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>1. 在"标签管理"中为标签启用"用于AI反馈生成"并设置AI提示词</li>
          <li>2. 为学生添加对应的标签</li>
          <li>3. 在此页面选择学生，点击"生成反馈话术"</li>
          <li>4. AI会根据学生的所有标签提示词生成综合性的个性化反馈</li>
        </ul>
      </div>
    </div>
  );
};

export default AIFeedbackGenerator;
