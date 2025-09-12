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
  Map
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
      } else if (key === 'q') {
        // Q键切换学生
        switchToNextStudent();
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

    // 检查考试名称是否重复
    const existingExam = exams.find(exam => exam.name === examName.trim());
    if (existingExam) {
      toast({
        title: "创建失败",
        description: "考试名称已存在，请使用不同的名称",
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
      
      // 加载该学生已有的答案数据（如果有的话）
      const existingResult = getStudentExamResult(studentId);
      if (existingResult && existingResult.answers) {
        const studentAnswers = existingResult.answers as unknown as StudentAnswer[];
        // 将该学生的答案添加到当前答案中，但保留其他学生的答案
        const otherStudentsAnswers = currentAnswers.filter(a => a.studentId !== studentId);
        setCurrentAnswers([...otherStudentsAnswers, ...studentAnswers]);
      }
    }
  };

  const jumpToQuestion = (questionIndex: number) => {
    if (!currentExam || questionIndex < 0 || questionIndex >= currentExam.total_questions) return;
    setCurrentQuestionIndex(questionIndex);
  };

  const getQuestionAnswer = (questionIndex: number) => {
    if (!currentStudent) return null;
    return currentAnswers.find(a => a.studentId === currentStudent.id && a.questionIndex === questionIndex);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (!currentExam || currentStudentIndex >= filteredStudents.length) return;

    const student = filteredStudents[currentStudentIndex];
    
    // Ensure we have a valid score - never allow null/undefined/NaN
    const questionScore = currentExam.scores[currentQuestionIndex];
    const score = isCorrect ? (typeof questionScore === 'number' && !isNaN(questionScore) ? questionScore : 0) : 0;
    
    const answer: StudentAnswer = {
      studentId: student.id!,
      questionIndex: currentQuestionIndex,
      isCorrect: isCorrect,
      score: score,
    };

    console.log('Recording answer:', answer);

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
    
    // Ensure we have a valid total score - never allow null/undefined/NaN
    let totalScore = 0;
    let correctCount = 0;
    
    if (studentAnswers.length > 0) {
      totalScore = studentAnswers.reduce((sum, a) => {
        const score = typeof a.score === 'number' && !isNaN(a.score) ? a.score : 0;
        return sum + score;
      }, 0);
      correctCount = studentAnswers.filter(a => a.isCorrect === true).length;
    }
    
    // Ensure totalScore is never NaN or null
    totalScore = typeof totalScore === 'number' && !isNaN(totalScore) ? totalScore : 0;
    correctCount = typeof correctCount === 'number' && !isNaN(correctCount) ? correctCount : 0;

    try {
      console.log('Saving exam result:', {
        user_id: user.id,
        exam_id: currentExam.id,
        student_id: student.id,
        total_score: totalScore,
        correct_count: correctCount,
        answers_count: studentAnswers.length
      });

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

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // 重新加载考试结果以确保数据同步
      await loadExamResults();

      toast({
        title: "学生评分完成",
        description: `${student.name} 总分: ${totalScore}/${currentExam.scores.reduce((sum, s) => sum + s, 0)}`,
      });

      // 检查是否所有学生都完成评分，如果是手动选择学生则不自动跳转
      if (selectedStudentId) {
        // 手动选择的学生评分完成，保持在当前学生
        setSelectedStudentId(null);
        return;
      }

      // 自动模式：继续下一个学生
      const nextUncompletedIndex = findNextUncompletedStudent();
      if (nextUncompletedIndex !== -1) {
        setCurrentStudentIndex(nextUncompletedIndex);
        setCurrentQuestionIndex(0);
      } else {
        // 全部完成
        finishScoring();
      }
    } catch (error: any) {
      console.error('Save error details:', error);
      toast({
        title: "保存失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
    }
  };

  // 查找下一个未完成评分的学生
  const findNextUncompletedStudent = () => {
    if (!currentExam) return -1;
    
    for (let i = 0; i < filteredStudents.length; i++) {
      const student = filteredStudents[i];
      const hasResult = examResults.some(r => r.exam_id === currentExam.id && r.student_id === student.id);
      if (!hasResult) {
        return i;
      }
    }
    return -1; // 所有学生都已完成
  };

  // 获取学生的考试结果
  const getStudentExamResult = (studentId: string) => {
    if (!currentExam) return null;
    return examResults.find(r => r.exam_id === currentExam.id && r.student_id === studentId);
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

  const finishScoring = async () => {
    setIsScoring(false);
    // 重新加载结果并等待完成
    await loadExamResults();
    // 强制重新加载以确保所有数据都显示
    setTimeout(async () => {
      await loadExamResults();
    }, 500);
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

  const deleteExam = async (examId: string) => {
    if (!user) return;

    if (!confirm('确定要删除这次考试的所有数据吗？此操作无法撤销。')) {
      return;
    }

    try {
      // 先删除考试结果
      const { error: resultsError } = await supabase
        .from('exam_results')
        .delete()
        .eq('exam_id', examId)
        .eq('user_id', user.id);

      if (resultsError) throw resultsError;

      // 再删除考试
      const { error: examError } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
        .eq('user_id', user.id);

      if (examError) throw examError;

      // 更新本地状态
      setExams(prev => prev.filter(exam => exam.id !== examId));
      setExamResults(prev => prev.filter(result => result.exam_id !== examId));

      toast({
        title: "删除成功",
        description: "考试及其所有成绩数据已删除",
      });
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 切换到下一个学生
  const switchToNextStudent = () => {
    if (!isScoring || !currentExam) return;
    
    const nextIndex = (currentStudentIndex + 1) % filteredStudents.length;
    setCurrentStudentIndex(nextIndex);
    setCurrentQuestionIndex(0);
    setSelectedStudentId(null);
    
    const nextStudent = filteredStudents[nextIndex];
    // 加载该学生已有的答案数据（如果有的话）
    const existingResult = getStudentExamResult(nextStudent.id!);
    if (existingResult && existingResult.answers) {
      const studentAnswers = existingResult.answers as unknown as StudentAnswer[];
      // 将该学生的答案添加到当前答案中，但保留其他学生的答案
      const otherStudentsAnswers = currentAnswers.filter(a => a.studentId !== nextStudent.id);
      setCurrentAnswers([...otherStudentsAnswers, ...studentAnswers]);
    }
    
    toast({
      title: "切换学生",
      description: `已切换到：${nextStudent.name}`,
    });
  };

  // 全对功能
  const handleAllCorrect = async () => {
    if (!currentStudent || !currentExam || !user) return;
    
    if (!confirm(`确定要将 ${currentStudent.name} 的所有题目标记为正确吗？`)) {
      return;
    }
    
    const allCorrectAnswers: StudentAnswer[] = [];
    for (let i = 0; i < currentExam.total_questions; i++) {
      allCorrectAnswers.push({
        studentId: currentStudent.id!,
        questionIndex: i,
        isCorrect: true,
        score: currentExam.scores[i] || 0,
      });
    }
    
    // 更新当前答案
    const otherStudentsAnswers = currentAnswers.filter(a => a.studentId !== currentStudent.id);
    const newAnswers = [...otherStudentsAnswers, ...allCorrectAnswers];
    setCurrentAnswers(newAnswers);
    
    // 立即保存结果
    await finishStudentScoring(currentStudent, newAnswers);
  };

  // 全错功能
  const handleAllIncorrect = async () => {
    if (!currentStudent || !currentExam || !user) return;
    
    if (!confirm(`确定要将 ${currentStudent.name} 的所有题目标记为错误吗？`)) {
      return;
    }
    
    const allIncorrectAnswers: StudentAnswer[] = [];
    for (let i = 0; i < currentExam.total_questions; i++) {
      allIncorrectAnswers.push({
        studentId: currentStudent.id!,
        questionIndex: i,
        isCorrect: false,
        score: 0,
      });
    }
    
    // 更新当前答案
    const otherStudentsAnswers = currentAnswers.filter(a => a.studentId !== currentStudent.id);
    const newAnswers = [...otherStudentsAnswers, ...allIncorrectAnswers];
    setCurrentAnswers(newAnswers);
    
    // 立即保存结果
    await finishStudentScoring(currentStudent, newAnswers);
  };

  // 处理Excel文件上传
  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          toast({
            title: "文件错误",
            description: "Excel文件为空",
            variant: "destructive",
          });
          return;
        }

        // 第一行作为列名
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
        
        const formattedData = rows.map(row => {
          const obj: ExcelData = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        setExcelColumns(headers);
        setExcelData(formattedData);
        setExcelExamName(`导入考试_${new Date().toLocaleDateString()}`);
        setColumnMapping({
          studentName: '',
          studentClass: '',
          scores: {}
        });
        setShowExcelMapping(true);

        toast({
          title: "文件上传成功",
          description: `已读取 ${formattedData.length} 行数据，${headers.length} 列`,
        });
      } catch (error: any) {
        toast({
          title: "文件解析失败",
          description: error.message || "请确保文件格式正确",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // 重置文件输入
    event.target.value = '';
  };

  // 处理Excel数据导入
  const processExcelImport = async () => {
    if (!excelExamName.trim() || !columnMapping.studentName) {
      toast({
        title: "配置不完整",
        description: "请填写考试名称并至少配置学生姓名列",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    // 检查考试名称是否重复
    const existingExam = exams.find(exam => exam.name === excelExamName.trim());
    if (existingExam) {
      toast({
        title: "导入失败",
        description: "考试名称已存在，请使用不同的名称",
        variant: "destructive",
      });
      return;
    }

    try {
      // 获取所有题目列
      const scoreColumns = Object.values(columnMapping.scores);
      const totalQuestions = scoreColumns.length;
      
      if (totalQuestions === 0) {
        toast({
          title: "配置错误",
          description: "请至少配置一个成绩列",
          variant: "destructive",
        });
        return;
      }

      // 计算每题满分（假设满分为每题可能的最高分）
      const questionScores: number[] = [];
      for (let i = 0; i < totalQuestions; i++) {
        const column = scoreColumns[i];
        const maxScore = Math.max(...excelData.map(row => {
          const value = parseFloat(row[column]);
          return isNaN(value) ? 0 : value;
        }));
        questionScores.push(maxScore > 0 ? maxScore : 10); // 默认10分
      }

      // 创建考试
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert({
          user_id: user.id,
          name: excelExamName.trim(),
          total_questions: totalQuestions,
          scores: questionScores
        })
        .select()
        .single();

      if (examError) throw examError;

      let processedCount = 0;
      let skippedCount = 0;
      
      // 处理每个学生的成绩
      for (const row of excelData) {
        const studentName = row[columnMapping.studentName]?.toString().trim();
        if (!studentName) continue;

        // 查找对应的学生
        const matchedStudent = students.find(s => s.name === studentName);
        if (!matchedStudent) {
          skippedCount++;
          continue;
        }

        // 解析成绩数据
        const answers: StudentAnswer[] = [];
        let totalScore = 0;
        let correctCount = 0;

        scoreColumns.forEach((column, questionIndex) => {
          const score = parseFloat(row[column]) || 0;
          const isCorrect = score > 0;
          
          answers.push({
            studentId: matchedStudent.id!,
            questionIndex,
            isCorrect,
            score
          });

          totalScore += score;
          if (isCorrect) correctCount++;
        });

        // 保存考试结果
        const { error: resultError } = await supabase
          .from('exam_results')
          .insert({
            user_id: user.id,
            exam_id: examData.id,
            student_id: matchedStudent.id!,
            answers: answers as unknown as any,
            total_score: totalScore,
            correct_count: correctCount
          });

        if (resultError) {
          console.error('保存成绩失败:', resultError);
        } else {
          processedCount++;
        }
      }

      // 更新本地状态
      const formattedExam: ExamConfig = {
        ...examData,
        scores: questionScores,
        created_at: new Date(examData.created_at)
      };
      setExams(prev => [formattedExam, ...prev]);
      await loadExamResults();

      setShowExcelMapping(false);
      setExcelData([]);
      setExcelColumns([]);

      toast({
        title: "导入成功",
        description: `已导入 ${processedCount} 名学生成绩${skippedCount > 0 ? `，跳过 ${skippedCount} 名未匹配学生` : ''}`,
      });

    } catch (error: any) {
      toast({
        title: "导入失败",
        description: error.message || "未知错误",
        variant: "destructive",
      });
    }
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

            {/* Excel导入考试 */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-accent" />
                  Excel导入考试成绩
                </CardTitle>
                <CardDescription>
                  上传包含学生成绩的Excel文件，系统将自动匹配学生并创建考试记录
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">选择Excel文件</p>
                    <p className="text-xs text-muted-foreground">
                      支持 .xlsx 和 .xls 格式，第一行应为列标题
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button asChild className="mt-4">
                      <span>选择文件</span>
                    </Button>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">使用说明：</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Excel第一行必须是列标题（如：姓名、班级、第1题、第2题等）</li>
                    <li>• 学生姓名必须与系统中现有学生完全匹配</li>
                    <li>• 不匹配的学生将被跳过，不会创建新学生</li>
                    <li>• 成绩列应包含数字分数，0分表示错误，大于0表示正确</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
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
                      <div className="flex items-center gap-2">
                        {scoringHistory.length > 0 && (
                          <Button onClick={undoLastAnswer} variant="outline" size="sm">
                            <Undo className="w-4 h-4 mr-2" />
                            撤销
                          </Button>
                        )}
                        <Button onClick={switchToNextStudent} variant="outline" size="sm">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          切换学生 (Q)
                        </Button>
                      </div>
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
                        {currentStudent && currentExam && (
                          <>
                            {/* 题号导航 */}
                            <div className="space-y-4">
                              <div className="text-center">
                                <h3 className="text-lg font-medium mb-3">题目导航</h3>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {Array.from({ length: currentExam.total_questions }, (_, i) => {
                                    const answer = getQuestionAnswer(i);
                                    const isCurrentQuestion = i === currentQuestionIndex;
                                    const isAnswered = answer !== null;
                                    
                                    return (
                                      <Button
                                        key={i}
                                        onClick={() => jumpToQuestion(i)}
                                        size="sm"
                                        variant={isCurrentQuestion ? "default" : "outline"}
                                        className={`
                                          w-10 h-10 rounded-full font-medium
                                          ${isCurrentQuestion 
                                            ? 'bg-primary text-primary-foreground' 
                                            : isAnswered 
                                              ? answer?.isCorrect 
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' 
                                                : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                                          }
                                        `}
                                      >
                                        {i + 1}
                                      </Button>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  点击题号可跳转到对应题目 | 绿色=正确 红色=错误 灰色=未答
                                </div>
                              </div>
                            </div>

                            <div className="text-center space-y-4">
                              <div className="text-2xl font-bold text-primary">
                                {currentStudent.name}
                              </div>
                              <div className="text-muted-foreground">
                                {currentStudent.class} | 第 {currentStudentIndex + 1} 位学生
                              </div>
                              <div className="text-sm text-accent">
                                第 {currentQuestionIndex + 1} 题 / 共 {currentExam.total_questions} 题 | 本题分值: {currentExam.scores[currentQuestionIndex]} 分
                              </div>
                            </div>

                            <div className="space-y-4">
                              {/* 答题按钮 */}
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

                              {/* 全对/全错按钮 */}
                              <div className="flex items-center justify-center gap-4 pt-4 border-t">
                                <Button
                                  onClick={handleAllCorrect}
                                  variant="outline"
                                  size="sm"
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  全对
                                </Button>
                                <Button
                                  onClick={handleAllIncorrect}
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  全错
                                </Button>
                              </div>
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                              使用键盘快捷键 {keyBindings.correct} / {keyBindings.incorrect} 答题，Q键切换学生
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
                         {filteredStudents.map((student, index) => {
                           const studentResult = getStudentExamResult(student.id!);
                           const isCompleted = !!studentResult;
                           const isCurrent = index === currentStudentIndex && !selectedStudentId;
                           const isSelected = selectedStudentId === student.id;
                           
                           return (
                             <div
                               key={student.id}
                               onClick={() => selectStudent(student.id!)}
                               className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-sm ${
                                 isSelected || isCurrent
                                   ? 'bg-primary text-primary-foreground border-primary' 
                                   : isCompleted
                                     ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                                     : 'border-border hover:border-primary/50'
                               }`}
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <span className="text-sm font-medium">{index + 1}.</span>
                                   <span className="font-medium">{student.name}</span>
                                 </div>
                                 <div className="text-xs">
                                   {student.class}
                                 </div>
                               </div>
                               <div className="flex items-center justify-between mt-2">
                                 <div className="flex items-center gap-2">
                                   {isCompleted && (
                                     <Badge variant="secondary" className="text-xs bg-emerald-500 text-white">
                                       ✓ 已评分
                                     </Badge>
                                   )}
                                   {(isSelected || isCurrent) && (
                                     <Badge variant="secondary" className="text-xs">
                                       {isSelected ? '已选中' : '正在评分'}
                                     </Badge>
                                   )}
                                 </div>
                                 {isCompleted && (
                                   <div className="text-xs">
                                     {studentResult?.total_score}/{currentExam?.scores.reduce((sum, s) => sum + s, 0)}分
                                   </div>
                                 )}
                               </div>
                             </div>
                           );
                         })}
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
              <ResultsView 
                exams={exams}
                students={students}
                examResults={examResults}
                getExamResults={getExamResults}
                exportResults={exportResults}
              />
            )}
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
                        onClick={() => exportResults(examDetailView)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        导出Excel
                      </Button>
                      <Button
                        onClick={() => {
                          if (examDetailView && confirm('确定要删除这次考试的所有数据吗？此操作无法撤销。')) {
                            deleteExam(examDetailView);
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
                              <th className="text-left py-4 px-4 font-medium">姓名</th>
                              <th className="text-left py-4 px-4 font-medium">班级</th>
                              <th className="text-center py-4 px-4 font-medium">总分</th>
                              <th className="text-center py-4 px-4 font-medium">正确率</th>
                              {Array.from({ length: exam.total_questions }, (_, i) => (
                                <th key={i} className="text-center py-4 px-2 font-medium min-w-[60px]">
                                  第{i + 1}题<br />
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({exam.scores[i]}分)
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((result, index) => {
                              const student = students.find(s => s.id === result.student_id);
                              const totalPossible = exam.scores.reduce((sum, s) => sum + s, 0);
                              const accuracyRate = ((result.correct_count / exam.total_questions) * 100).toFixed(1);
                              
                              return (
                                <tr key={result.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
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
                                <div className="text-xs text-muted-foreground mt-2">
                                  创建时间: {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : '未知'}
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

        {/* Excel列映射配置对话框 */}
        <Dialog open={showExcelMapping} onOpenChange={setShowExcelMapping}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                配置Excel列映射
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* 考试名称 */}
              <div>
                <Label htmlFor="excel-exam-name">考试名称</Label>
                <Input
                  id="excel-exam-name"
                  value={excelExamName}
                  onChange={(e) => setExcelExamName(e.target.value)}
                  placeholder="请输入考试名称"
                />
              </div>

              {/* 基础信息映射 */}
              <div className="space-y-4">
                <h3 className="font-medium">基础信息列映射</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>学生姓名列 *</Label>
                    <Select
                      value={columnMapping.studentName}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, studentName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择姓名列" />
                      </SelectTrigger>
                      <SelectContent>
                        {excelColumns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>班级列 (可选)</Label>
                    <Select
                      value={columnMapping.studentClass}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, studentClass: value === "__none__" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择班级列" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不选择</SelectItem>
                        {excelColumns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 成绩列映射 */}
              <div className="space-y-4">
                <h3 className="font-medium">成绩列映射</h3>
                <div className="space-y-2">
                  {Array.from({ length: Math.max(1, Object.keys(columnMapping.scores).length + 1) }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-16 text-sm">第{i + 1}题:</span>
                      <Select
                        value={columnMapping.scores[i] || ''}
                        onValueChange={(value) => {
                          const newScores = { ...columnMapping.scores };
                          if (value && value !== "__none__") {
                            newScores[i] = value;
                          } else {
                            delete newScores[i];
                          }
                          setColumnMapping(prev => ({ ...prev, scores: newScores }));
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="选择成绩列" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">不选择</SelectItem>
                          {excelColumns.filter(col => 
                            col !== columnMapping.studentName && 
                            col !== columnMapping.studentClass &&
                            !Object.values(columnMapping.scores).includes(col)
                          ).map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 数据预览 */}
              {excelData.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">数据预览 (前3行)</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {excelColumns.map(col => (
                            <th key={col} className="p-2 text-left border-r">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 3).map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {excelColumns.map(col => (
                              <td key={col} className="p-2 border-r">{row[col]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 匹配结果预览 */}
              {columnMapping.studentName && (
                <div className="space-y-2">
                  <h3 className="font-medium">学生匹配结果</h3>
                  <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    {excelData.map((row, i) => {
                      const studentName = row[columnMapping.studentName]?.toString().trim();
                      const matched = students.find(s => s.name === studentName);
                      return (
                        <div key={i} className="text-sm flex items-center gap-2">
                          <span className={matched ? 'text-green-600' : 'text-red-500'}>
                            {matched ? '✓' : '✗'}
                          </span>
                          <span>{studentName}</span>
                          {matched && <Badge variant="secondary" className="text-xs">{matched.class}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowExcelMapping(false)}
                >
                  取消
                </Button>
                <Button onClick={processExcelImport}>
                  开始导入
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ResultsView 组件 - 查看成绩的新界面
const ResultsView = ({ 
  exams, 
  students, 
  examResults, 
  getExamResults, 
  exportResults 
}: {
  exams: ExamConfig[];
  students: Student[];
  examResults: ExamResult[];
  getExamResults: (examId: string) => ExamResult[];
  exportResults: (examId?: string) => void;
}) => {
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  
  // 切换考试选择
  const toggleExam = (examId: string) => {
    setSelectedExams(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  // 获取学生在指定考试中的成绩
  const getStudentScore = (studentId: string, examId: string) => {
    const result = examResults.find(r => r.student_id === studentId && r.exam_id === examId);
    return result;
  };

  // 筛选学生
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(nameFilter.toLowerCase())
  );

  // 导出选中考试的成绩
  const exportSelectedExams = () => {
    if (selectedExams.length === 0) {
      toast({
        title: "请选择考试",
        description: "请先选择要导出的考试",
        variant: "destructive",
      });
      return;
    }

    const data = filteredStudents.map(student => {
      const row: any = {
        姓名: student.name,
        班级: student.class,
      };
      
      selectedExams.forEach(examId => {
        const exam = exams.find(e => e.id === examId);
        const result = getStudentScore(student.id!, examId);
        const maxScore = exam ? exam.scores.reduce((sum, s) => sum + s, 0) : 0;
        
        if (exam) {
          row[`${exam.name}_得分`] = result ? result.total_score : '-';
          row[`${exam.name}_满分`] = maxScore;
          row[`${exam.name}_正确率`] = result ? `${((result.correct_count / exam.total_questions) * 100).toFixed(1)}%` : '-';
        }
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "学生成绩");
    
    const examNames = selectedExams.map(id => exams.find(e => e.id === id)?.name).join('_');
    XLSX.writeFile(workbook, `学生成绩_${examNames}_${new Date().toLocaleDateString()}.xlsx`);
    
    toast({
      title: "导出成功",
      description: "成绩数据已导出到Excel文件",
    });
  };

  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* 考试选择区域 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-accent" />
            选择考试
          </CardTitle>
          <CardDescription>
            勾选要查看的考试，可多选查看学生历次考试成绩
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {exams.map(exam => {
              const results = getExamResults(exam.id!);
              const isSelected = selectedExams.includes(exam.id!);
              
              return (
                <div
                  key={exam.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => toggleExam(exam.id!)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{exam.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {exam.total_questions}题 · {results.length}人已评分
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedExams.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Badge variant="secondary">
                已选择 {selectedExams.length} 个考试
              </Badge>
              <Button onClick={exportSelectedExams} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出选中考试成绩
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学生成绩列表 */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                学生成绩列表
              </CardTitle>
              <CardDescription>
                {selectedExams.length === 0 
                  ? '请先选择考试以查看成绩'
                  : `显示 ${filteredStudents.length} 名学生的成绩`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="name-filter" className="text-sm">筛选学生:</Label>
                <Input
                  id="name-filter"
                  placeholder="输入学生姓名..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-32"
                />
              </div>
              <Badge variant="outline">
                {filteredStudents.length} 名学生
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {selectedExams.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">请选择考试</h3>
            <p className="text-muted-foreground">
              在上方勾选要查看的考试，即可显示学生成绩
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">姓名</th>
                    <th className="text-left py-3 px-4 font-medium">班级</th>
                    {selectedExams.map(examId => {
                      const exam = exams.find(e => e.id === examId);
                      return exam ? (
                        <th key={examId} className="text-center py-3 px-4 font-medium">
                          <div className="space-y-1">
                            <div className="text-sm">{exam.name}</div>
                            <div className="text-xs text-muted-foreground">
                              满分 {exam.scores.reduce((sum, s) => sum + s, 0)}
                            </div>
                          </div>
                        </th>
                      ) : null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{student.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{student.class || '-'}</td>
                      {selectedExams.map(examId => {
                        const exam = exams.find(e => e.id === examId);
                        const result = getStudentScore(student.id!, examId);
                        const maxScore = exam ? exam.scores.reduce((sum, s) => sum + s, 0) : 0;
                        
                        return (
                          <td key={examId} className="py-3 px-4 text-center">
                            {result ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {result.total_score}/{maxScore}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {((result.correct_count / exam!.total_questions) * 100).toFixed(1)}%
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td 
                        colSpan={2 + selectedExams.length} 
                        className="py-8 text-center text-muted-foreground"
                      >
                        没有找到匹配的学生
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ScoringSystem;