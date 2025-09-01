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
  Keyboard
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  name: string;
  class: string;
  [key: string]: any;
}

interface ExamConfig {
  id: string;
  name: string;
  totalQuestions: number;
  scores: number[];
  createdAt: Date;
}

interface StudentAnswer {
  studentId: string;
  questionIndex: number;
  isCorrect: boolean;
  score: number;
}

interface ExamResult {
  examId: string;
  studentId: string;
  answers: StudentAnswer[];
  totalScore: number;
  correctCount: number;
  createdAt: Date;
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
  
  // 筛选和快捷键状态
  const [nameFilter, setNameFilter] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [keyBindings, setKeyBindings] = useState<KeyBinding>({ correct: 'y', incorrect: 'n' });
  const [showKeySettings, setShowKeySettings] = useState(false);
  
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化筛选学生列表
  useEffect(() => {
    let filtered = students;
    if (nameFilter) {
      const firstLetter = nameFilter.toLowerCase();
      filtered = students.filter(student => 
        student.name.toLowerCase().charAt(0) === firstLetter ||
        student.name.toLowerCase().includes(firstLetter)
      );
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

  const createExam = () => {
    if (!examName.trim() || totalQuestions <= 0) {
      toast({
        title: "创建失败",
        description: "请填写完整的考试信息",
        variant: "destructive",
      });
      return;
    }

    const newExam: ExamConfig = {
      id: `exam-${Date.now()}`,
      name: examName,
      totalQuestions,
      scores: [...questionScores],
      createdAt: new Date(),
    };

    setExams(prev => [...prev, newExam]);
    setExamName('');
    setTotalQuestions(10);
    setQuestionScores([]);
    
    toast({
      title: "创建成功",
      description: `考试"${newExam.name}"已创建`,
    });
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
    setIsScoring(true);
    setActiveTab('scoring');
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentExam || currentStudentIndex >= filteredStudents.length) return;

    const student = filteredStudents[currentStudentIndex];
    const score = isCorrect ? currentExam.scores[currentQuestionIndex] : 0;
    
    const answer: StudentAnswer = {
      studentId: student.id,
      questionIndex: currentQuestionIndex,
      isCorrect,
      score,
    };

    const newAnswers = [...currentAnswers, answer];
    setCurrentAnswers(newAnswers);

    // 下一题
    if (currentQuestionIndex < currentExam.totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // 当前学生完成，保存结果
      const studentAnswers = newAnswers.filter(a => a.studentId === student.id);
      const totalScore = studentAnswers.reduce((sum, a) => sum + a.score, 0);
      const correctCount = studentAnswers.filter(a => a.isCorrect).length;

      const result: ExamResult = {
        examId: currentExam.id,
        studentId: student.id,
        answers: studentAnswers,
        totalScore,
        correctCount,
        createdAt: new Date(),
      };

      setExamResults(prev => [...prev, result]);

      // 下一个学生
      if (currentStudentIndex < filteredStudents.length - 1) {
        setCurrentStudentIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        toast({
          title: "学生评分完成",
          description: `${student.name} 总分: ${totalScore}/${currentExam.scores.reduce((sum, s) => sum + s, 0)}`,
        });
      } else {
        // 全部完成
        finishScoring();
      }
    }
  };

  const finishScoring = () => {
    setIsScoring(false);
    setActiveTab('results');
    toast({
      title: "评分完成",
      description: `所有学生评分完成！`,
    });
  };

  const exportResults = () => {
    if (!currentExam || examResults.length === 0) return;

    const examData = examResults.filter(r => r.examId === currentExam.id);
    const exportData = examData.map(result => {
      const student = students.find(s => s.id === result.studentId);
      const data: any = {
        '姓名': student?.name || '',
        '班级': student?.class || '',
        '总分': result.totalScore,
        '正确题数': result.correctCount,
        '正确率': `${((result.correctCount / currentExam.totalQuestions) * 100).toFixed(1)}%`,
      };

      // 添加每题得分
      for (let i = 0; i < currentExam.totalQuestions; i++) {
        const answer = result.answers.find(a => a.questionIndex === i);
        data[`第${i + 1}题`] = answer ? answer.score : 0;
      }

      return data;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "考试成绩");
    XLSX.writeFile(workbook, `${currentExam.name}_成绩_${new Date().toLocaleDateString()}.xlsx`);
    
    toast({
      title: "导出成功",
      description: "考试成绩已导出到Excel文件",
    });
  };

  const getStudentExamHistory = (studentId: string) => {
    return examResults.filter(r => r.studentId === studentId);
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
                            {exam.totalQuestions} 题
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
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">选择一场考试开始评分</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* 学生筛选 */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-accent" />
                      学生筛选
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="name-filter">按姓名首字母筛选</Label>
                        <Input
                          id="name-filter"
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                          placeholder="输入姓名首字母，如: 张"
                        />
                      </div>
                      <div className="flex items-end">
                        <Badge variant="secondary" className="px-3 py-2">
                          共 {filteredStudents.length} 名学生
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 当前评分 */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>正在评分: {currentExam?.name}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">
                          学生 {currentStudentIndex + 1}/{filteredStudents.length}
                        </Badge>
                        <Badge variant="outline">
                          题目 {currentQuestionIndex + 1}/{currentExam?.totalQuestions}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {currentStudent && (
                      <div className="text-center space-y-4">
                        <div className="bg-muted/50 p-6 rounded-lg">
                          <h2 className="text-2xl font-bold text-primary mb-2">
                            {currentStudent.name}
                          </h2>
                          <p className="text-muted-foreground">
                            班级: {currentStudent.class}
                          </p>
                        </div>

                        <div className="bg-accent/10 p-6 rounded-lg">
                          <h3 className="text-xl font-medium mb-2">
                            第 {currentQuestionIndex + 1} 题
                          </h3>
                          <p className="text-muted-foreground">
                            本题分值: {currentExam?.scores[currentQuestionIndex]} 分
                          </p>
                        </div>

                        <div className="flex gap-4 justify-center">
                          <Button 
                            onClick={() => handleAnswer(true)}
                            className="bg-success hover:bg-success/90 text-success-foreground"
                            size="lg"
                          >
                            <Check className="w-6 h-6 mr-2" />
                            正确 ({keyBindings.correct.toUpperCase()})
                          </Button>
                          <Button 
                            onClick={() => handleAnswer(false)}
                            variant="destructive"
                            size="lg"
                          >
                            <X className="w-6 h-6 mr-2" />
                            错误 ({keyBindings.incorrect.toUpperCase()})
                          </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          使用键盘快捷键: {keyBindings.correct.toUpperCase()} = 正确, {keyBindings.incorrect.toUpperCase()} = 错误
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* 成绩查看 */}
          <TabsContent value="results" className="space-y-6">
            {currentExam && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-accent" />
                      {currentExam.name} - 成绩统计
                    </span>
                    <Button onClick={exportResults} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      导出Excel
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {examResults
                      .filter(r => r.examId === currentExam.id)
                      .map(result => {
                        const student = students.find(s => s.id === result.studentId);
                        if (!student) return null;

                        return (
                          <div key={result.studentId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-muted-foreground">{student.class}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-medium">{result.totalScore} 分</div>
                                <div className="text-sm text-muted-foreground">
                                  {result.correctCount}/{currentExam.totalQuestions} 题正确
                                </div>
                              </div>
                              <Badge 
                                variant={result.totalScore >= currentExam.scores.reduce((s, sc) => s + sc, 0) * 0.6 ? "default" : "destructive"}
                              >
                                {((result.correctCount / currentExam.totalQuestions) * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 历史记录 */}
          <TabsContent value="history" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>学生考试历史</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map(student => {
                    const history = getStudentExamHistory(student.id);
                    if (history.length === 0) return null;

                    return (
                      <div key={student.id} className="border rounded-lg p-4 space-y-3">
                        <div>
                          <h3 className="font-medium">{student.name}</h3>
                          <p className="text-sm text-muted-foreground">{student.class}</p>
                        </div>
                        <div className="space-y-2">
                          {history.map(result => {
                            const exam = exams.find(e => e.id === result.examId);
                            return (
                              <div key={`${result.examId}-${result.studentId}`} className="text-sm">
                                <div className="flex justify-between">
                                  <span>{exam?.name}</span>
                                  <span className="font-medium">{result.totalScore}分</span>
                                </div>
                                <div className="text-muted-foreground">
                                  正确率: {((result.correctCount / (exam?.totalQuestions || 1)) * 100).toFixed(1)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 快捷键设置对话框 */}
        <Dialog open={showKeySettings} onOpenChange={setShowKeySettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>快捷键设置</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              <Button onClick={() => setShowKeySettings(false)} className="w-full">
                保存设置
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ScoringSystem;