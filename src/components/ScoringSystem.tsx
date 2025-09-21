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
  Undo,
  ArrowRight,
  Upload,
  Map,
  PieChart,
  Eye,
  TrendingUp
} from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Pie } from 'recharts';
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

interface ExcelColumnMapping {
  studentName: string;
  studentClass: string;
  scores: { [key: string]: string };
}

interface ExcelData {
  [key: string]: any;
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
  const [showStudentDetails, setShowStudentDetails] = useState<{ [examId: string]: boolean }>({});
  const [examDetailView, setExamDetailView] = useState<string | null>(null);
  const [questionDetailView, setQuestionDetailView] = useState<{ examId: string; questionIndex: number } | null>(null);
  const [showErrorDistribution, setShowErrorDistribution] = useState<string | null>(null);
  
  // 登分时学生选择状态
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Excel导入相关状态
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [showExcelMapping, setShowExcelMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ExcelColumnMapping>({
    studentName: '',
    studentClass: '',
    scores: {}
  });
  const [excelExamName, setExcelExamName] = useState('');

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

  const getExamResults = (examId: string) => {
    return examResults.filter(r => r.exam_id === examId);
  };

  const getExamAverageScore = (examId: string) => {
    const results = getExamResults(examId);
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.total_score, 0);
    return (total / results.length).toFixed(1);
  };

  // 获取题目统计信息
  const getQuestionStats = (examId: string, questionIndex: number) => {
    const results = getExamResults(examId);
    if (results.length === 0) return { correctCount: 0, totalCount: 0, correctRate: 0, students: [] };
    
    const studentAnswers = results.map(result => {
      const student = students.find(s => s.id === result.student_id);
      const answer = result.answers.find(a => a.questionIndex === questionIndex);
      return {
        student,
        answer: answer || { isCorrect: false, score: 0 },
        totalScore: result.total_score
      };
    }).filter(item => item.student);
    
    const correctCount = studentAnswers.filter(item => item.answer.isCorrect).length;
    const correctRate = (correctCount / studentAnswers.length * 100);
    
    return {
      correctCount,
      totalCount: studentAnswers.length,
      correctRate: Math.round(correctRate * 10) / 10,
      students: studentAnswers
    };
  };

  // 获取错题分布数据
  const getErrorDistributionData = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return [];
    
    const results = getExamResults(examId);
    if (results.length === 0) return [];
    
    return Array.from({ length: exam.total_questions }, (_, i) => {
      const stats = getQuestionStats(examId, i);
      return {
        name: `第${i + 1}题`,
        正确率: stats.correctRate,
        错误率: 100 - stats.correctRate,
        正确人数: stats.correctCount,
        总人数: stats.totalCount,
        分值: exam.scores[i]
      };
    });
  };

  // 加载数据
  useEffect(() => {
    if (user) {
      loadExams();
      loadExamResults();
    }
  }, [user]);

  const currentStudent = isScoring && filteredStudents[currentStudentIndex];

  return (
    <div className="min-h-screen bg-gradient-subtle p-6" ref={containerRef}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              ← 返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">登分系统</h1>
              <p className="text-muted-foreground">创建考试、登记分数、查看历史记录</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">创建考试</TabsTrigger>
            <TabsTrigger value="score">登分</TabsTrigger>
            <TabsTrigger value="history">历史记录</TabsTrigger>
          </TabsList>

          {/* 创建考试 */}
          <TabsContent value="create" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" />
                  创建新考试
                </CardTitle>
                <CardDescription>
                  设置考试名称和题目分数配置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="examName">考试名称</Label>
                      <Input
                        id="examName"
                        placeholder="请输入考试名称..."
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="totalQuestions">题目数量</Label>
                      <Input
                        id="totalQuestions"
                        type="number"
                        min="1"
                        max="100"
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>分数设置</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="uniform"
                            checked={useUniformScore}
                            onChange={() => setUseUniformScore(true)}
                          />
                          <Label htmlFor="uniform">统一分数</Label>
                        </div>
                        {useUniformScore && (
                          <Input
                            type="number"
                            min="1"
                            placeholder="每题分数"
                            value={uniformScore}
                            onChange={(e) => setUniformScore(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="custom"
                            checked={!useUniformScore}
                            onChange={() => setUseUniformScore(false)}
                          />
                          <Label htmlFor="custom">自定义分数</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {!useUniformScore && (
                  <div className="space-y-4">
                    <Label>题目分数设置</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {Array.from({ length: totalQuestions }, (_, i) => (
                        <div key={i} className="space-y-1">
                          <Label className="text-xs">第{i + 1}题</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="分数"
                            value={questionScores[i] || ''}
                            onChange={(e) => {
                              const newScores = [...questionScores];
                              newScores[i] = Math.max(1, parseInt(e.target.value) || 1);
                              setQuestionScores(newScores);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 历史记录 */}
          <TabsContent value="history" className="space-y-6">
            {examDetailView ? (
              // 考试详情页面
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => setExamDetailView(null)}
                        variant="outline"
                        size="sm"
                      >
                        ← 返回
                      </Button>
                      <div>
                        <CardTitle>学生成绩详情</CardTitle>
                        <CardDescription>
                          {exams.find(e => e.id === examDetailView)?.name}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowErrorDistribution(examDetailView)}
                        variant="outline"
                        size="sm"
                      >
                        <PieChart className="w-4 h-4 mr-2" />
                        错题分布
                      </Button>
                      <Button
                        onClick={() => {
                          if (examDetailView && confirm('确定要删除这次考试的所有数据吗？此操作无法撤销。')) {
                            // deleteExam(examDetailView);
                            setExamDetailView(null);
                          }
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        删除考试
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const exam = exams.find(e => e.id === examDetailView);
                    const results = getExamResults(examDetailView);
                    
                    if (!exam || results.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileSpreadsheet className="w-12 h-12 mx-auto mb-2" />
                          <p>该考试暂无成绩记录</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-center py-4 px-4 font-medium">排名</th>
                              <th className="text-left py-4 px-4 font-medium">姓名</th>
                              <th className="text-left py-4 px-4 font-medium">班级</th>
                              <th className="text-center py-4 px-4 font-medium">总分</th>
                              <th className="text-center py-4 px-4 font-medium">正确率</th>
                              {Array.from({ length: exam.total_questions }, (_, i) => (
                                <th key={i} className="text-center py-4 px-2 font-medium min-w-[60px] cursor-pointer hover:bg-blue-50 transition-colors group"
                                    onClick={() => setQuestionDetailView({ examId: examDetailView, questionIndex: i })}>
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                      <span>第{i + 1}题</span>
                                      <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-xs font-normal text-muted-foreground">
                                      ({exam.scores[i]}分)
                                    </span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results
                              .sort((a, b) => b.total_score - a.total_score)
                              .map((result, index) => {
                              const student = students.find(s => s.id === result.student_id);
                              const totalPossible = exam.scores.reduce((sum, s) => sum + s, 0);
                              const accuracyRate = ((result.correct_count / exam.total_questions) * 100).toFixed(1);
                              const rank = index + 1;
                              
                              return (
                                <tr key={result.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                                  <td className="text-center py-4 px-4">
                                    <Badge variant="secondary" className={`
                                      ${rank === 1 ? 'bg-yellow-500 text-white' : 
                                        rank === 2 ? 'bg-gray-400 text-white' : 
                                        rank === 3 ? 'bg-amber-600 text-white' : 
                                        'bg-gray-200 text-gray-700'}
                                    `}>
                                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                    </Badge>
                                  </td>
                                  <td className="py-4 px-4 font-medium">{student?.name}</td>
                                  <td className="py-4 px-4 text-muted-foreground">{student?.class}</td>
                                  <td className="text-center py-4 px-4">
                                    <Badge variant="secondary" className="bg-gray-900 text-white hover:bg-gray-800">
                                      {result.total_score}/{totalPossible}
                                    </Badge>
                                  </td>
                                  <td className="text-center py-4 px-4">
                                    <Badge variant="secondary" className="bg-gray-900 text-white hover:bg-gray-800">
                                      {accuracyRate}%
                                    </Badge>
                                  </td>
                                  {Array.from({ length: exam.total_questions }, (_, i) => {
                                    const answer = result.answers.find((a: StudentAnswer) => a.questionIndex === i);
                                    const score = answer ? answer.score : 0;
                                    return (
                                      <td key={i} className="text-center py-4 px-2">
                                        <div className="flex justify-center">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                            answer?.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                                          }`}>
                                            {score}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              // 历史记录列表
              <>
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
                        点击考试查看详细成绩
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exams.map(exam => {
                          const results = getExamResults(exam.id!);
                          const averageScore = getExamAverageScore(exam.id!);
                          const totalScore = exam.scores.reduce((sum, s) => sum + s, 0);
                          const averageCorrectRate = results.length > 0 
                            ? (results.reduce((sum, r) => sum + (r.correct_count / exam.total_questions), 0) / results.length * 100).toFixed(1)
                            : '0';
                          
                          return (
                            <Button
                              key={exam.id}
                              onClick={() => setExamDetailView(exam.id!)}
                              variant="outline"
                              className="h-auto p-6 flex flex-col items-start text-left space-y-3 hover:shadow-md transition-shadow"
                            >
                              <div className="w-full">
                                <h3 className="font-semibold text-lg mb-2">{exam.name}</h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>平均分: {averageScore}/{totalScore}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>{results.length}人参加</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4" />
                                    <span>正确率: {averageCorrectRate}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{exam.total_questions}题</span>
                                  </div>
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* 题目详情对话框 */}
        {questionDetailView && (
          <Dialog open={true} onOpenChange={() => setQuestionDetailView(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {(() => {
                    const exam = exams.find(e => e.id === questionDetailView.examId);
                    return `${exam?.name} - 第${questionDetailView.questionIndex + 1}题详情`;
                  })()}
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const exam = exams.find(e => e.id === questionDetailView.examId);
                const stats = getQuestionStats(questionDetailView.examId, questionDetailView.questionIndex);
                
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.correctCount}</div>
                        <div className="text-sm text-green-700">正确人数</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.totalCount - stats.correctCount}</div>
                        <div className="text-sm text-red-700">错误人数</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.correctRate}%</div>
                        <div className="text-sm text-blue-700">正确率</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-600">{exam?.scores[questionDetailView.questionIndex]}</div>
                        <div className="text-sm text-gray-700">题目分值</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">学生答题情况</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left py-3 px-4 font-medium">排名</th>
                              <th className="text-left py-3 px-4 font-medium">姓名</th>
                              <th className="text-left py-3 px-4 font-medium">班级</th>
                              <th className="text-center py-3 px-4 font-medium">答题结果</th>
                              <th className="text-center py-3 px-4 font-medium">得分</th>
                              <th className="text-center py-3 px-4 font-medium">总分</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.students.sort((a, b) => b.totalScore - a.totalScore).map((item, index) => (
                              <tr key={item.student?.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                                <td className="py-3 px-4"><Badge variant="secondary">#{index + 1}</Badge></td>
                                <td className="py-3 px-4 font-medium">{item.student?.name}</td>
                                <td className="py-3 px-4 text-muted-foreground">{item.student?.class}</td>
                                <td className="text-center py-3 px-4">
                                  <Badge className={item.answer.isCorrect ? 'bg-green-500' : 'bg-red-500'}>
                                    {item.answer.isCorrect ? '正确' : '错误'}
                                  </Badge>
                                </td>
                                <td className="text-center py-3 px-4 font-medium">
                                  {item.answer.score}/{exam?.scores[questionDetailView.questionIndex]}
                                </td>
                                <td className="text-center py-3 px-4 text-muted-foreground">{item.totalScore}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        {/* 错题分布对话框 */}
        {showErrorDistribution && (
          <Dialog open={true} onOpenChange={() => setShowErrorDistribution(null)}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {(() => {
                    const exam = exams.find(e => e.id === showErrorDistribution);
                    return `${exam?.name} - 错题分布分析`;
                  })()}
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const distributionData = getErrorDistributionData(showErrorDistribution);
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{distributionData.length}</div>
                        <div className="text-sm text-blue-700">总题数</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(distributionData.reduce((sum, item) => sum + item.正确率, 0) / distributionData.length)}%
                        </div>
                        <div className="text-sm text-green-700">平均正确率</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {distributionData.filter(item => item.正确率 < 60).length}
                        </div>
                        <div className="text-sm text-red-700">难题数量</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {distributionData.reduce((sum, item) => sum + item.分值, 0)}
                        </div>
                        <div className="text-sm text-yellow-700">总分值</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4">各题正确率对比</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={distributionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value: any) => [`${value}%`, '正确率']} />
                            <Bar dataKey="正确率" fill="#10B981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default ScoringSystem;