import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  Check, 
  X, 
  Play, 
  Download,
  Trophy,
  BarChart3,
  Filter,
  Keyboard,
  Undo
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '@/hooks/useStudentData';

interface ExamConfig {
  id?: string;
  name: string;
  total_questions: number;
  scores: number[];
  created_at?: Date;
}

interface StudentAnswer {
  studentId: string;
  questionIndex: number;
  isCorrect: boolean;
  score: number;
}

interface ExamResult {
  id?: string;
  exam_id: string;
  student_id: string;
  answers: StudentAnswer[];
  total_score: number;
  correct_count: number;
  created_at?: Date;
}

interface KeyBinding {
  correct: string;
  incorrect: string;
}

interface ScoringSystemProps {
  students: Student[];
  onClose: () => void;
}

const ScoringSystem = ({ students, onClose }: ScoringSystemProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [exams, setExams] = useState<ExamConfig[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  
  // 创建考试相关状态
  const [examName, setExamName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [questionScores, setQuestionScores] = useState<number[]>([]);
  const [uniformScore, setUniformScore] = useState(10);
  const [useUniformScore, setUseUniformScore] = useState(true);
  
  // 登分相关状态
  const [currentExam, setCurrentExam] = useState<ExamConfig | null>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<StudentAnswer[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringHistory, setScoringHistory] = useState<StudentAnswer[][]>([]);
  
  // 筛选和快捷键状态
  const [nameFilter, setNameFilter] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [keyBindings, setKeyBindings] = useState<KeyBinding>({ correct: 'y', incorrect: 'n' });
  const [showKeySettings, setShowKeySettings] = useState(false);
  
  // 历史记录状态
  const [selectedHistoryExam, setSelectedHistoryExam] = useState<string | null>(null);
  
  // 登分时学生选择状态
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // 常用姓氏拼音首字母映射
  const surnameMap: Record<string, string> = {
    '李': 'L', '王': 'W', '张': 'Z', '刘': 'L', '陈': 'C', '杨': 'Y', '赵': 'Z', '黄': 'H',
    '周': 'Z', '吴': 'W', '徐': 'X', '孙': 'S', '胡': 'H', '朱': 'Z', '高': 'G', '林': 'L',
    '何': 'H', '郭': 'G', '马': 'M', '罗': 'L', '梁': 'L', '宋': 'S', '郑': 'Z', '谢': 'X',
    '韩': 'H', '唐': 'T', '冯': 'F', '于': 'Y', '董': 'D', '萧': 'X', '程': 'C', '曹': 'C',
    '袁': 'Y', '邓': 'D', '许': 'X', '傅': 'F', '沈': 'S', '曾': 'Z', '彭': 'P', '吕': 'L',
    '苏': 'S', '卢': 'L', '蒋': 'J', '蔡': 'C', '贾': 'J', '丁': 'D', '魏': 'W', '薛': 'X',
    '叶': 'Y', '阎': 'Y', '余': 'Y', '潘': 'P', '杜': 'D', '戴': 'D', '夏': 'X', '钟': 'Z',
    '汪': 'W', '田': 'T', '任': 'R', '姜': 'J', '范': 'F', '方': 'F', '石': 'S', '姚': 'Y',
    '谭': 'T', '廖': 'L', '邹': 'Z', '熊': 'X', '金': 'J', '陆': 'L', '郝': 'H', '孔': 'K',
    '白': 'B', '崔': 'C', '康': 'K', '毛': 'M', '邱': 'Q', '秦': 'Q', '江': 'J', '史': 'S',
    '顾': 'G', '侯': 'H', '邵': 'S', '孟': 'M', '龙': 'L', '万': 'W', '段': 'D', '章': 'Z',
    '钱': 'Q', '汤': 'T', '尹': 'Y', '黎': 'L', '易': 'Y', '常': 'C', '武': 'W', '乔': 'Q'
  };

  // 从数据库加载考试数据
  const loadExams = async () => {
    if (!user) return;

    try {
      const { data: examsData, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedExams: ExamConfig[] = (examsData || []).map(exam => ({
        ...exam,
        scores: Array.isArray(exam.scores) ? exam.scores as number[] : [],
        created_at: new Date(exam.created_at)
      }));
      
      setExams(formattedExams);
    } catch (error: any) {
      toast({
        title: "加载考试失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 从数据库加载考试结果
  const loadExamResults = async () => {
    if (!user) return;

    try {
      const { data: resultsData, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedResults: ExamResult[] = (resultsData || []).map(result => ({
        ...result,
        answers: Array.isArray(result.answers) ? result.answers as unknown as StudentAnswer[] : [],
        created_at: new Date(result.created_at)
      }));
      
      setExamResults(formattedResults);
    } catch (error: any) {
      toast({
        title: "加载成绩失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 初始化数据
  useEffect(() => {
    if (user) {
      loadExams();
      loadExamResults();
    }
  }, [user]);

  // 初始化筛选学生列表
  useEffect(() => {
    let filtered = students;
    if (nameFilter) {
      const filterLetter = nameFilter.toUpperCase();
      filtered = students.filter(student => {
        const surname = student.name.charAt(0);
        const pinyinLetter = surnameMap[surname] || surname.toUpperCase();
        return pinyinLetter === filterLetter || student.name.includes(nameFilter);
      });
    }
    setFilteredStudents(filtered);
  }, [students, nameFilter]);

  // 初始化题目分数
  useEffect(() => {
    if (useUniformScore) {
      setQuestionScores(Array(totalQuestions).fill(uniformScore));
    }
  }, [totalQuestions, uniformScore, useUniformScore]);

  // 键盘事件处理
  useEffect(() => {
    if (!isScoring) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === keyBindings.correct.toLowerCase()) {
        handleAnswer(true);
      } else if (key === keyBindings.incorrect.toLowerCase()) {
        handleAnswer(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isScoring, keyBindings, currentStudentIndex, currentQuestionIndex]);

  const createExam = async () => {
    if (!examName.trim() || totalQuestions <= 0 || !user) {
      toast({
        title: "创建失败",
        description: "请填写完整的考试信息",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          user_id: user.id,
          name: examName,
          total_questions: totalQuestions,
          scores: questionScores
        })
        .select()
        .single();

      if (error) throw error;

      const formattedExam: ExamConfig = {
        ...data,
        scores: Array.isArray(data.scores) ? data.scores as number[] : [],
        created_at: new Date(data.created_at)
      };
      
      setExams(prev => [formattedExam, ...prev]);
      setExamName('');
      setTotalQuestions(10);
      setQuestionScores([]);
      
      toast({
        title: "创建成功",
        description: `考试"${data.name}"已创建`,
      });
    } catch (error: any) {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startScoring = (exam: ExamConfig) => {
    if (filteredStudents.length === 0) {
      toast({
        title: "无法开始",
        description: "没有可评分的学生",
        variant: "destructive",
      });
      return;
    }

    setCurrentExam(exam);
    setCurrentStudentIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentAnswers([]);
    setSelectedStudentId(null);
    setIsScoring(true);
    setScoringHistory([]);
    setActiveTab('scoring');
  };
  
  const selectStudent = (studentId: string) => {
    const index = filteredStudents.findIndex(s => s.id === studentId);
    if (index !== -1) {
      setCurrentStudentIndex(index);
      setCurrentQuestionIndex(0);
      setSelectedStudentId(studentId);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentExam || currentStudentIndex >= filteredStudents.length) return;

    const student = filteredStudents[currentStudentIndex];
    const score = isCorrect ? currentExam.scores[currentQuestionIndex] : 0;
    
    const answer: StudentAnswer = {
      studentId: student.id!,
      questionIndex: currentQuestionIndex,
      isCorrect,
      score,
    };

    // 检查是否已经对当前学生的当前题目进行过评分，如果有则覆盖
    const existingAnswerIndex = currentAnswers.findIndex(
      a => a.studentId === student.id! && a.questionIndex === currentQuestionIndex
    );
    
    let newAnswers: StudentAnswer[];
    if (existingAnswerIndex !== -1) {
      // 覆盖现有答案
      newAnswers = [...currentAnswers];
      newAnswers[existingAnswerIndex] = answer;
    } else {
      // 添加新答案
      newAnswers = [...currentAnswers, answer];
    }
    
    setCurrentAnswers(newAnswers);
    
    // 保存到历史记录用于撤销
    setScoringHistory(prev => [...prev, newAnswers]);

    // 下一题
    if (currentQuestionIndex < currentExam.total_questions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // 当前学生完成，保存结果
      finishStudentScoring(student, newAnswers);
    }
  };

  const finishStudentScoring = async (student: Student, answers: StudentAnswer[]) => {
    if (!currentExam || !user) return;

    const studentAnswers = answers.filter(a => a.studentId === student.id);
    const totalScore = studentAnswers.reduce((sum, a) => sum + a.score, 0);
    const correctCount = studentAnswers.filter(a => a.isCorrect).length;

    try {
      const { error } = await supabase
        .from('exam_results')
        .upsert({
          user_id: user.id,
          exam_id: currentExam.id!,
          student_id: student.id!,
          answers: studentAnswers as unknown as any,
          total_score: totalScore,
          correct_count: correctCount
        }, { 
          onConflict: 'exam_id,student_id' 
        });

      if (error) throw error;

      toast({
        title: "学生评分完成",
        description: `${student.name} 总分: ${totalScore}/${currentExam.scores.reduce((sum, s) => sum + s, 0)}`,
      });

      // 下一个学生
      if (currentStudentIndex < filteredStudents.length - 1) {
        setCurrentStudentIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        // 全部完成
        finishScoring();
      }
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const undoLastAnswer = () => {
    if (scoringHistory.length === 0) return;
    
    const previousState = scoringHistory[scoringHistory.length - 2] || [];
    setCurrentAnswers(previousState);
    setScoringHistory(prev => prev.slice(0, -1));
    
    // 回退到上一题
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentStudentIndex > 0) {
      // 回到上一个学生的最后一题
      setCurrentStudentIndex(prev => prev - 1);
      setCurrentQuestionIndex(currentExam!.total_questions - 1);
    }
    
    toast({
      title: "已撤销",
      description: "已撤销上一次答题结果",
    });
  };

  const finishScoring = () => {
    setIsScoring(false);
    loadExamResults(); // 重新加载结果
    setActiveTab('results');
    toast({
      title: "评分完成",
      description: `所有学生评分完成！`,
    });
  };

  const exportResults = (examId?: string) => {
    const targetExamId = examId || currentExam?.id;
    if (!targetExamId) return;

    const exam = exams.find(e => e.id === targetExamId);
    if (!exam) return;

    const examData = examResults.filter(r => r.exam_id === targetExamId);
    if (examData.length === 0) {
      toast({
        title: "无数据导出",
        description: "该考试暂无成绩记录",
        variant: "destructive",
      });
      return;
    }

    const exportData = examData.map(result => {
      const student = students.find(s => s.id === result.student_id);
      const data: any = {
        '姓名': student?.name || '',
        '班级': student?.class || '',
        '总分': result.total_score,
        '正确题数': result.correct_count,
        '正确率': `${((result.correct_count / exam.total_questions) * 100).toFixed(1)}%`,
      };

      // 添加每题得分
      for (let i = 0; i < exam.total_questions; i++) {
        const answer = result.answers.find((a: StudentAnswer) => a.questionIndex === i);
        data[`第${i + 1}题`] = answer ? answer.score : 0;
      }

      return data;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "考试成绩");
    XLSX.writeFile(workbook, `${exam.name}_成绩_${new Date().toLocaleDateString()}.xlsx`);
    
    toast({
      title: "导出成功",
      description: "考试成绩已导出到Excel文件",
    });
  };

  const getExamResults = (examId: string) => {
    return examResults.filter(r => r.exam_id === examId);
  };

  const getExamAverageScore = (examId: string) => {
    const results = getExamResults(examId);
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.total_score, 0);
    return (total / results.length).toFixed(1);
  };

  const currentStudent = isScoring && filteredStudents[currentStudentIndex];

  return (
    <div className="min-h-screen bg-gradient-subtle p-6" ref={containerRef}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">登分系统</h1>
            <p className="text-muted-foreground mt-2">高效的考试评分和成绩管理系统</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Trophy className="w-4 h-4 mr-1" />
              {exams.length} 场考试
            </Badge>
            <Button onClick={() => setShowKeySettings(true)} variant="outline">
              <Keyboard className="w-4 h-4 mr-2" />
              快捷键设置
            </Button>
            <Button onClick={onClose} variant="outline">
              返回
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-fit">
            <TabsTrigger value="create">创建考试</TabsTrigger>
            <TabsTrigger value="scoring">开始评分</TabsTrigger>
            <TabsTrigger value="results">查看成绩</TabsTrigger>
            <TabsTrigger value="history">历史记录</TabsTrigger>
          </TabsList>

          {/* 创建考试 */}
          <TabsContent value="create" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  新建考试
                </CardTitle>
                <CardDescription>
                  设置考试名称、题目数量和每题分值
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="exam-name">考试名称</Label>
                      <Input
                        id="exam-name"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        placeholder="请输入考试名称"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="total-questions">题目数量</Label>
                      <Input
                        id="total-questions"
                        type="number"
                        min="1"
                        max="100"
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        id="uniform-score"
                        checked={useUniformScore}
                        onChange={(e) => setUseUniformScore(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="uniform-score">统一分值</Label>
                      {useUniformScore && (
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={uniformScore}
                          onChange={(e) => setUniformScore(parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      )}
                    </div>
                  </div>

                  {!useUniformScore && (
                    <div className="space-y-4">
                      <Label>各题分值设置</Label>
                      <div className="max-h-64 overflow-y-auto space-y-2 p-4 border rounded-lg">
                        {Array.from({ length: totalQuestions }, (_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm w-12">第{i + 1}题:</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={questionScores[i] || 0}
                              onChange={(e) => {
                                const newScores = [...questionScores];
                                newScores[i] = parseFloat(e.target.value) || 0;
                                setQuestionScores(newScores);
                              }}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">分</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={createExam} className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  创建考试
                </Button>
              </CardContent>
            </Card>

            {/* 已创建的考试列表 */}
            {exams.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>已创建的考试</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map(exam => (
                      <div key={exam.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{exam.name}</h3>
                          <Badge variant="outline">
                            {exam.total_questions} 题
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          总分: {exam.scores.reduce((sum, s) => sum + s, 0)} 分
                        </div>
                        <Button 
                          onClick={() => startScoring(exam)}
                          className="w-full"
                          size="sm"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          开始评分
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 评分界面 */}
          <TabsContent value="scoring" className="space-y-6">
            {!isScoring ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">请先选择考试</h3>
                  <p className="text-muted-foreground mb-6">
                    从"创建考试"标签页选择一个考试开始评分
                  </p>
                  <Button onClick={() => setActiveTab('create')} variant="outline">
                    前往创建考试
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 筛选区域 */}
                <Card className="shadow-card">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-accent" />
                        <Label>姓氏筛选:</Label>
                      </div>
                      <Input
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="输入姓氏首字母或姓名"
                        className="w-48"
                      />
                      <div className="text-sm text-muted-foreground">
                        共 {filteredStudents.length} 名学生
                      </div>
                      {scoringHistory.length > 0 && (
                        <Button onClick={undoLastAnswer} variant="outline" size="sm">
                          <Undo className="w-4 h-4 mr-2" />
                          撤销
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 当前评分状态 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>正在评分: {currentExam?.name}</span>
                          <Badge variant="secondary">
                            第 {currentQuestionIndex + 1} 题 / {currentExam?.total_questions} 题
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {currentStudent && (
                          <>
                            <div className="text-center space-y-4">
                              <div className="text-2xl font-bold text-primary">
                                {currentStudent.name}
                              </div>
                              <div className="text-muted-foreground">
                                {currentStudent.class} | 第 {currentStudentIndex + 1} 位学生
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-6">
                              <Button
                                onClick={() => handleAnswer(true)}
                                size="lg"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4"
                              >
                                <Check className="w-6 h-6 mr-2" />
                                正确 ({keyBindings.correct})
                              </Button>
                              <Button
                                onClick={() => handleAnswer(false)}
                                size="lg"
                                variant="destructive"
                                className="px-8 py-4"
                              >
                                <X className="w-6 h-6 mr-2" />
                                错误 ({keyBindings.incorrect})
                              </Button>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                              使用键盘快捷键 {keyBindings.correct} / {keyBindings.incorrect} 或点击按钮进行评分
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* 学生列表 */}
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent" />
                        学生列表
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredStudents.map((student, index) => (
                          <Button
                            key={student.id}
                            variant={index === currentStudentIndex ? "default" : "ghost"}
                            size="sm"
                            onClick={() => selectStudent(student.id!)}
                            className="w-full justify-start"
                          >
                            <span className="mr-2">{index + 1}.</span>
                            {student.name}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {student.class}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* 查看成绩 */}
          <TabsContent value="results" className="space-y-6">
            {exams.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无成绩数据</h3>
                  <p className="text-muted-foreground mb-6">
                    请先创建考试并完成评分
                  </p>
                  <Button onClick={() => setActiveTab('create')} variant="outline">
                    创建第一个考试
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {exams.map(exam => {
                  const results = getExamResults(exam.id!);
                  return (
                    <Card key={exam.id} className="shadow-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{exam.name}</CardTitle>
                            <CardDescription>
                              {exam.total_questions} 题 · 总分 {exam.scores.reduce((sum, s) => sum + s, 0)} 分
                              {results.length > 0 && (
                                <span className="ml-4">
                                  平均分: {getExamAverageScore(exam.id!)} 分
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {results.length} 人已评分
                            </Badge>
                            {results.length > 0 && (
                              <Button
                                onClick={() => exportResults(exam.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                导出
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {results.length > 0 && (
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">姓名</th>
                                  <th className="text-left py-2">班级</th>
                                  <th className="text-center py-2">总分</th>
                                  <th className="text-center py-2">正确率</th>
                                </tr>
                              </thead>
                              <tbody>
                                {results.map(result => {
                                  const student = students.find(s => s.id === result.student_id);
                                  return (
                                    <tr key={result.id} className="border-b">
                                      <td className="py-2">{student?.name}</td>
                                      <td className="py-2">{student?.class}</td>
                                      <td className="text-center py-2">
                                        {result.total_score}/{exam.scores.reduce((sum, s) => sum + s, 0)}
                                      </td>
                                      <td className="text-center py-2">
                                        {((result.correct_count / exam.total_questions) * 100).toFixed(1)}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 历史记录 */}
          <TabsContent value="history" className="space-y-6">
            {exams.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无历史记录</h3>
                  <p className="text-muted-foreground">
                    还没有创建任何考试
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>考试历史记录</CardTitle>
                  <CardDescription>
                    点击考试卡片查看详细成绩
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={selectedHistoryExam || ''} onValueChange={setSelectedHistoryExam}>
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(exams.length, 4)}, 1fr)` }}>
                      {exams.slice(0, 4).map(exam => (
                        <TabsTrigger key={exam.id} value={exam.id!}>
                          {exam.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                     {exams.map(exam => {
                       const results = getExamResults(exam.id!);
                       return (
                         <TabsContent key={exam.id} value={exam.id!} className="mt-6">
                           <div className="space-y-4">
                             <div className="flex items-center justify-between">
                               <div>
                                 <h3 className="text-lg font-semibold">{exam.name}</h3>
                                 <p className="text-sm text-muted-foreground">
                                   创建时间: {exam.created_at ? new Date(exam.created_at).toLocaleString() : '未知'}
                                 </p>
                               </div>
                               <div className="text-right">
                                 <div className="text-lg font-semibold">
                                   平均分: {getExamAverageScore(exam.id!)} 分
                                 </div>
                                 <div className="text-sm text-muted-foreground">
                                   {results.length} 人参加
                                 </div>
                               </div>
                             </div>
                             
                             {results.length > 0 && (
                               <div className="mt-6">
                                 <h4 className="text-md font-medium mb-4">学生成绩详情</h4>
                                 <div className="overflow-x-auto">
                                   <table className="w-full border-collapse">
                                     <thead>
                                       <tr className="border-b">
                                         <th className="text-left py-2 px-4">姓名</th>
                                         <th className="text-left py-2 px-4">班级</th>
                                         <th className="text-center py-2 px-4">总分</th>
                                         <th className="text-center py-2 px-4">正确率</th>
                                         <th className="text-center py-2 px-4">各题得分</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {results.map(result => {
                                         const student = students.find(s => s.id === result.student_id);
                                         return (
                                           <tr key={result.id} className="border-b hover:bg-muted/50">
                                             <td className="py-2 px-4">{student?.name}</td>
                                             <td className="py-2 px-4">{student?.class}</td>
                                             <td className="text-center py-2 px-4">
                                               <Badge variant="secondary">
                                                 {result.total_score}/{exam.scores.reduce((sum, s) => sum + s, 0)}
                                               </Badge>
                                             </td>
                                             <td className="text-center py-2 px-4">
                                               {((result.correct_count / exam.total_questions) * 100).toFixed(1)}%
                                             </td>
                                             <td className="text-center py-2 px-4">
                                               <div className="flex gap-1 justify-center flex-wrap">
                                                 {Array.from({ length: exam.total_questions }, (_, i) => {
                                                   const answer = result.answers.find((a: StudentAnswer) => a.questionIndex === i);
                                                   return (
                                                     <Badge 
                                                       key={i} 
                                                       variant={answer?.isCorrect ? "default" : "destructive"}
                                                       className="text-xs"
                                                     >
                                                       {i + 1}: {answer ? answer.score : 0}
                                                     </Badge>
                                                   );
                                                 })}
                                               </div>
                                             </td>
                                           </tr>
                                         );
                                       })}
                                     </tbody>
                                   </table>
                                 </div>
                               </div>
                             )}
                           </div>
                         </TabsContent>
                       );
                     })}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 快捷键设置对话框 */}
        <Dialog open={showKeySettings} onOpenChange={setShowKeySettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>快捷键设置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="correct-key">正确答案快捷键</Label>
                  <Input
                    id="correct-key"
                    value={keyBindings.correct}
                    onChange={(e) => setKeyBindings(prev => ({ ...prev, correct: e.target.value }))}
                    maxLength={1}
                  />
                </div>
                <div>
                  <Label htmlFor="incorrect-key">错误答案快捷键</Label>
                  <Input
                    id="incorrect-key"
                    value={keyBindings.incorrect}
                    onChange={(e) => setKeyBindings(prev => ({ ...prev, incorrect: e.target.value }))}
                    maxLength={1}
                  />
                </div>
              </div>
              <Button onClick={() => setShowKeySettings(false)} className="w-full">
                确定
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ScoringSystem;