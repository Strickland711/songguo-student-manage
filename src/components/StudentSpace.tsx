import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, User, BookOpen, MessageSquare, Target, Star, TrendingUp, Calendar, Award, BarChart3, Activity, Tag } from 'lucide-react';
import { Student } from '@/hooks/useStudentData';
import { useFeedbackData } from '@/hooks/useFeedbackData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudentSpaceProps {
  student: Student;
  onClose: () => void;
}

interface ExamResult {
  id: string;
  exam_name: string;
  total_score: number;
  correct_count: number;
  total_questions: number;
  created_at: string;
}

interface StudentTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

const StudentSpace = ({ student, onClose }: StudentSpaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [scoringRecords, setScoringRecords] = useState<any[]>([]);
  const [studentTags, setStudentTags] = useState<StudentTag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { feedbackRecords, getFeedbackByStudent } = useFeedbackData();

  // Load student data
  useEffect(() => {
    if (!user || !student.id) return;
    
    const loadStudentData = async () => {
      try {
        // Load exam results
        const { data: examData, error: examError } = await supabase
          .from('exam_results')
          .select(`
            id,
            total_score,
            correct_count,
            created_at,
            exams!inner(name, total_questions)
          `)
          .eq('user_id', user.id)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        if (examError) throw examError;

        const formattedExamResults = (examData || []).map(exam => ({
          id: exam.id,
          exam_name: exam.exams?.name || '未知考试',
          total_score: exam.total_score,
          correct_count: exam.correct_count,
          total_questions: exam.exams?.total_questions || 0,
          created_at: exam.created_at
        }));

        setExamResults(formattedExamResults);

        // Load scoring records
        const { data: scoringData, error: scoringError } = await supabase
          .from('scoring_records')
          .select('*')
          .eq('user_id', user.id)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        if (scoringError) throw scoringError;
        setScoringRecords(scoringData || []);

        // Load student tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('student_tags')
          .select('tag_id')
          .eq('student_id', student.id);

        if (tagsError) throw tagsError;
        
        if (tagsData && tagsData.length > 0) {
          const tagIds = tagsData.map(item => item.tag_id);
          
          const { data: tagDetails, error: tagDetailsError } = await supabase
            .from('tags')
            .select('id, name, color, description')
            .in('id', tagIds)
            .eq('user_id', user.id);
            
          if (tagDetailsError) throw tagDetailsError;
          setStudentTags(tagDetails || []);
        } else {
          setStudentTags([]);
        }

        setLoading(false);
      } catch (error: any) {
        console.error('Error loading student data:', error);
        toast({
          title: "加载失败",
          description: "无法加载学生数据",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadStudentData();
  }, [user, student.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl h-[80vh]">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">加载学生空间中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentFeedback = getFeedbackByStudent(student.id || '');
  const averageScore = examResults.length > 0 
    ? examResults.reduce((sum, exam) => sum + exam.total_score, 0) / examResults.length 
    : 0;
  const averageCorrectRate = examResults.length > 0
    ? examResults.reduce((sum, exam) => sum + (exam.correct_count / exam.total_questions), 0) / examResults.length * 100
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'happy': return 'bg-green-100 text-green-700 border-green-200';
      case 'neutral': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'sad': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl h-[95vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">{student.name}</CardTitle>
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  班级: {student.class}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Key Metrics */}
            <div className="lg:col-span-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">平均分数</p>
                        <p className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
                          {averageScore.toFixed(1)}
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">正确率</p>
                        <p className="text-3xl font-bold text-green-600">
                          {averageCorrectRate.toFixed(1)}%
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">考试次数</p>
                        <p className="text-3xl font-bold text-purple-600">{examResults.length}</p>
                      </div>
                      <Award className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">标签数量</p>
                        <p className="text-3xl font-bold text-orange-600">{studentTags.length}</p>
                      </div>
                      <Tag className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Student Tags */}
            <div className="lg:col-span-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    学生标签
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studentTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {studentTags.map(tag => (
                        <Badge 
                          key={tag.id} 
                          className="px-3 py-2 text-sm font-medium"
                          style={{ 
                            backgroundColor: `${tag.color}20`, 
                            color: tag.color,
                            borderColor: `${tag.color}40`
                          }}
                          variant="outline"
                          title={tag.description || tag.name}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无标签</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Exam Results */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    考试成绩
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {examResults.length > 0 ? examResults.map(exam => (
                      <Card key={exam.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{exam.exam_name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(exam.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={exam.total_score >= 80 ? "default" : exam.total_score >= 60 ? "secondary" : "destructive"}>
                            {exam.total_score.toFixed(1)}分
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>正确率</span>
                            <span>{((exam.correct_count / exam.total_questions) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={(exam.correct_count / exam.total_questions) * 100} 
                            className="h-2"
                          />
                        </div>
                      </Card>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>暂无考试记录</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feedback & Scoring */}
            <div className="lg:col-span-2 space-y-4">
              {/* Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                    学习反馈
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {studentFeedback.length > 0 ? studentFeedback.slice(0, 5).map(feedback => (
                      <Card key={feedback.id} className="p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{feedback.notes || '无备注'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {feedback.feedback_date}
                            </p>
                          </div>
                          <Badge className={getMoodColor(feedback.mood)}>
                            {feedback.mood === 'happy' ? '😊' : feedback.mood === 'neutral' ? '😐' : '😔'} {feedback.mood}
                          </Badge>
                        </div>
                      </Card>
                    )) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无反馈记录</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Scoring Records */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-accent" />
                    评分记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {scoringRecords.length > 0 ? scoringRecords.slice(0, 5).map(record => (
                      <Card key={record.id} className="p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-foreground">{record.category}</h5>
                            {record.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(record.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="font-bold">
                            {record.score}分
                          </Badge>
                        </div>
                      </Card>
                    )) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无评分记录</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentSpace;