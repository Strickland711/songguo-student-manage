import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smile, Meh, Frown, MessageSquare, Users, Calendar as CalendarIcon, Filter, FileText } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFeedbackData, FeedbackRecord } from '@/hooks/useFeedbackData';
import { useStudentData, Student } from '@/hooks/useStudentData';
import { useFeedbackTemplates } from '@/hooks/useFeedbackTemplates';
import FeedbackTemplateManager from '@/components/FeedbackTemplateManager';
import { cn } from '@/lib/utils';

interface FeedbackSystemProps {
  students: Student[];
}

const FeedbackSystem = ({ students }: FeedbackSystemProps) => {
  const { feedbackRecords, loading, saveFeedbackRecord, getFeedbackByDate, getFeedbackByStudentIds } = useFeedbackData();
  const { customFields } = useStudentData();
  const { templates, getTemplateForStudent, renderTemplate } = useFeedbackTemplates();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string>('');
  const [feedbackMood, setFeedbackMood] = useState<'happy' | 'neutral' | 'sad'>('neutral');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [selectedTemplateField, setSelectedTemplateField] = useState<string>('class');

  const moodIcons = {
    happy: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 border-green-200', label: '高兴' },
    neutral: { icon: Meh, color: 'text-yellow-500', bgColor: 'bg-yellow-50 border-yellow-200', label: '一般' },
    sad: { icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 border-red-200', label: '沮丧' }
  };

  // 获取所有班级用于筛选
  const allClasses = useMemo(() => {
    const classes = [...new Set(students.map(s => s.class))].filter(Boolean);
    return classes.sort();
  }, [students]);

  // 筛选学生
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesClass = filterClass === 'all' || student.class === filterClass;
      const matchesName = !searchName || student.name.toLowerCase().includes(searchName.toLowerCase());
      return matchesClass && matchesName;
    });
  }, [students, filterClass, searchName]);

  // 获取当前选中日期的反馈记录
  const todayFeedbacks = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return getFeedbackByDate(dateStr);
  }, [selectedDate, feedbackRecords, getFeedbackByDate]);

  // 计算日历上每天的反馈活跃度
  const getFeedbackActivityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayFeedbacks = getFeedbackByDate(dateStr);
    
    if (selectedStudents.length > 0) {
      // 如果有选中的学生，只显示这些学生的反馈
      return dayFeedbacks.filter(f => selectedStudents.includes(f.student_id)).length;
    }
    
    return dayFeedbacks.length;
  };

  // 处理学生选择
  const handleStudentSelection = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // 选择整个班级
  const selectClass = (className: string) => {
    const classStudentIds = students
      .filter(s => s.class === className)
      .map(s => s.id!)
      .filter(id => id);
    setSelectedStudents(prev => [...new Set([...prev, ...classStudentIds])]);
  };

  // 开始添加反馈
  const startFeedback = (studentId: string) => {
    setCurrentStudentId(studentId);
    
    // 检查是否已有当天反馈记录
    const existingFeedback = todayFeedbacks.find(f => f.student_id === studentId);
    if (existingFeedback) {
      setFeedbackMood(existingFeedback.mood);
      setFeedbackNotes(existingFeedback.notes || '');
    } else {
      setFeedbackMood('neutral');
      setFeedbackNotes('');
    }
    
    setShowFeedbackDialog(true);
  };

  // 保存反馈
  const handleSaveFeedback = async () => {
    if (!currentStudentId) return;

    try {
      const feedbackData: Omit<FeedbackRecord, 'id'> = {
        student_id: currentStudentId,
        feedback_date: format(selectedDate, 'yyyy-MM-dd'),
        mood: feedbackMood,
        notes: feedbackNotes.trim() || undefined
      };

      await saveFeedbackRecord(feedbackData);
      setShowFeedbackDialog(false);
      setCurrentStudentId('');
      setFeedbackNotes('');
    } catch (error) {
      // Error handled in hook
    }
  };

  // 获取学生的当天反馈
  const getStudentFeedback = (studentId: string) => {
    return todayFeedbacks.find(f => f.student_id === studentId);
  };

  // 自定义日历日期渲染
  const dayContent = (date: Date) => {
    const activity = getFeedbackActivityForDate(date);
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className={cn(
          "text-sm",
          isSelected && "font-bold",
          isToday && !isSelected && "text-primary"
        )}>
          {date.getDate()}
        </span>
        {activity > 0 && (
          <div className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full text-xs flex items-center justify-center text-white font-bold",
            activity >= 5 ? "bg-green-500" : activity >= 2 ? "bg-yellow-500" : "bg-blue-500"
          )}>
            {activity > 9 ? "9+" : activity}
          </div>
        )}
      </div>
    );
  };

  const currentStudent = students.find(s => s.id === currentStudentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载反馈数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs defaultValue="feedback" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="feedback">反馈管理</TabsTrigger>
            <TabsTrigger value="templates">话术模板</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-6 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-primary">家长反馈系统</h1>
                <p className="text-muted-foreground mt-2">记录和分析每日与家长的反馈沟通情况</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  今日反馈 {todayFeedbacks.length} 条
                </Badge>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 日历区域 */}
          <div className="lg:col-span-1">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-accent" />
                  反馈日历
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={zhCN}
                  className="rounded-md border pointer-events-auto"
                  components={{
                    DayContent: ({ date }) => dayContent(date)
                  }}
                />
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">活跃度说明:</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>1条反馈</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>2-4条</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>5条以上</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 学生名单区域 */}
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  学生反馈管理
                </CardTitle>
                <div className="flex items-center gap-4 mt-4">
                  {/* 班级筛选 */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="w-32">
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
                  </div>

                  {/* 姓名搜索 */}
                  <Input
                    placeholder="搜索学生姓名..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-48"
                  />

                  {/* 快速选择班级 */}
                  {allClasses.map(className => (
                    <Button
                      key={className}
                      variant="outline"
                      size="sm"
                      onClick={() => selectClass(className)}
                    >
                      选择{className}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredStudents.map(student => {
                    const feedback = getStudentFeedback(student.id!);
                    const isSelected = selectedStudents.includes(student.id!);
                    const MoodIcon = feedback ? moodIcons[feedback.mood].icon : null;
                    
                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          isSelected ? "bg-primary/5 border-primary/30" : "bg-background hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleStudentSelection(student.id!, checked as boolean)
                            }
                          />
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.class}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {feedback && (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                              moodIcons[feedback.mood].bgColor
                            )}>
                              <MoodIcon className={cn("w-3 h-3", moodIcons[feedback.mood].color)} />
                              <span>{moodIcons[feedback.mood].label}</span>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant={feedback ? "outline" : "default"}
                            onClick={() => startFeedback(student.id!)}
                          >
                            {feedback ? "编辑反馈" : "添加反馈"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 已选学生反馈活跃度展示 */}
                {selectedStudents.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium mb-3">选中学生反馈统计</h4>
                    <div className="text-sm text-muted-foreground">
                      已选择 {selectedStudents.length} 名学生，
                      近7天共有 {getFeedbackByStudentIds(selectedStudents).filter(f => {
                        const feedbackDate = new Date(f.feedback_date);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return feedbackDate >= weekAgo;
                      }).length} 条反馈记录
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <FeedbackTemplateManager customFields={customFields} students={students} />
          </TabsContent>
        </Tabs>

        {/* 反馈对话框 */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentStudent ? `${currentStudent.name} - ${currentStudent.class}` : '添加反馈'}
              </DialogTitle>
              <DialogDescription>
                记录与家长的反馈沟通情况 - {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 心情选择 */}
              <div>
                <label className="text-sm font-medium mb-2 block">反馈心情</label>
                <div className="flex gap-2">
                  {Object.entries(moodIcons).map(([mood, config]) => {
                    const Icon = config.icon;
                    const isSelected = feedbackMood === mood;
                    
                    return (
                      <Button
                        key={mood}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFeedbackMood(mood as any)}
                        className={cn(
                          "flex items-center gap-1",
                          isSelected && config.bgColor
                        )}
                      >
                        <Icon className={cn("w-4 h-4", config.color)} />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 备注和模板 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">反馈备注</label>
                  <div className="flex items-center gap-2">
                    <Select value={selectedTemplateField} onValueChange={setSelectedTemplateField}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class">按班级</SelectItem>
                        {customFields.map(field => (
                          <SelectItem key={field.name} value={field.name}>
                            按{field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      disabled={!currentStudent || !getTemplateForStudent(currentStudent, selectedTemplateField)}
                      onClick={() => {
                        if (!currentStudent) return;
                        const template = getTemplateForStudent(currentStudent, selectedTemplateField);
                        if (template) {
                          const rendered = renderTemplate(template.template, currentStudent);
                          setFeedbackNotes(rendered);
                        }
                      }}
                    >
                      <FileText className="w-3 h-3" />
                      使用话术模板
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="记录具体的反馈内容和沟通情况..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveFeedback}>
                保存反馈
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FeedbackSystem;