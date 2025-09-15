import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Smile, Meh, Frown, MessageSquare, Users, Calendar as CalendarIcon, Filter, BarChart3, Target, MessageCircle, Settings, Save, AlertTriangle, Clock, CheckCircle, XCircle, Plus, Trash2, Edit } from 'lucide-react';
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFeedbackData, FeedbackRecord } from '@/hooks/useFeedbackData';
import { useStudentData, Student } from '@/hooks/useStudentData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FeedbackSystemProps {
  students: Student[];
}

const FeedbackSystem = ({ students }: FeedbackSystemProps) => {
  const { feedbackRecords, loading, saveFeedbackRecord, getFeedbackByDate, deleteFeedbackRecord } = useFeedbackData();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [pendingFeedbacks, setPendingFeedbacks] = useState<Record<string, { mood: 'happy' | 'neutral' | 'sad', notes?: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotesStudent, setCurrentNotesStudent] = useState<{ id: string, name: string } | null>(null);
  const [notesInput, setNotesInput] = useState('');
  
  const { toast } = useToast();

  // 页面离开提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '您有未保存的反馈，确定要离开吗？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const moodIcons = {
    happy: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 border-green-200', label: '高兴' },
    neutral: { icon: Meh, color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-200', label: '一般' },
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
    return dayFeedbacks.length;
  };

  // 获取活跃度颜色
  const getActivityColor = (count: number) => {
    if (count === 0) return '';
    if (count <= 10) return 'bg-blue-500';
    if (count <= 20) return 'bg-cyan-500';
    if (count <= 30) return 'bg-green-500';
    if (count <= 40) return 'bg-yellow-500';
    if (count <= 50) return 'bg-orange-500';
    if (count <= 60) return 'bg-red-500';
    if (count <= 70) return 'bg-pink-500';
    if (count <= 80) return 'bg-purple-500';
    if (count <= 90) return 'bg-indigo-500';
    if (count <= 100) return 'bg-violet-500';
    return 'bg-slate-800'; // 100条以上固定颜色
  };

  // 获取学生的当天反馈（包括未保存的）
  const getStudentFeedback = (studentId: string) => {
    const savedFeedback = todayFeedbacks.find(f => f.student_id === studentId);
    const pendingFeedback = pendingFeedbacks[studentId];
    
    if (pendingFeedback) {
      return {
        ...savedFeedback,
        mood: pendingFeedback.mood,
        notes: pendingFeedback.notes,
        isPending: true
      };
    }
    
    return savedFeedback;
  };

  // 设置本地反馈状态
  const handleLocalFeedback = useCallback((studentId: string, mood: 'happy' | 'neutral' | 'sad', notes?: string) => {
    setPendingFeedbacks(prev => ({
      ...prev,
      [studentId]: { mood, notes: notes?.trim() || undefined }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // 批量保存反馈
  const handleSaveAll = useCallback(async () => {
    if (Object.keys(pendingFeedbacks).length === 0) {
      toast({
        title: "没有需要保存的反馈",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const savePromises = Object.entries(pendingFeedbacks).map(async ([studentId, feedback]) => {
        try {
          const feedbackData: Omit<FeedbackRecord, 'id'> = {
            student_id: studentId,
            feedback_date: format(selectedDate, 'yyyy-MM-dd'),
            mood: feedback.mood,
            notes: feedback.notes
          };

          await saveFeedbackRecord(feedbackData);
          successCount++;
        } catch (error) {
          errorCount++;
          throw error;
        }
      });

      await Promise.all(savePromises);
      
      setPendingFeedbacks({});
      setHasUnsavedChanges(false);
      
      toast({
        title: "保存成功",
        description: `成功保存了 ${successCount} 条反馈`,
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: `成功: ${successCount} 条，失败: ${errorCount} 条`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [pendingFeedbacks, selectedDate, saveFeedbackRecord, toast]);

  // 清空当日所有反馈记录
  const handleClearTodayFeedbacks = useCallback(async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayRecords = getFeedbackByDate(dateStr);
    
    if (todayRecords.length === 0) {
      toast({
        title: "没有需要清空的记录",
        description: "当前日期没有反馈记录",
        variant: "default",
      });
      return;
    }

    if (!confirm(`确定要清空 ${format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })} 的所有反馈记录吗？共 ${todayRecords.length} 条记录将被删除。`)) {
      return;
    }

    try {
      setIsSaving(true);
      
      // 批量删除当天的反馈记录
      const deletePromises = todayRecords.map(record => 
        deleteFeedbackRecord(record.id!)
      );
      
      await Promise.all(deletePromises);
      
      // 清空本地待保存的反馈
      setPendingFeedbacks(prev => {
        const newPending = { ...prev };
        todayRecords.forEach(record => {
          delete newPending[record.student_id];
        });
        return newPending;
      });
      
      toast({
        title: "清空成功",
        description: `已清空 ${todayRecords.length} 条反馈记录`,
      });
    } catch (error) {
      toast({
        title: "清空失败",
        description: "清空反馈记录时发生错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate, getFeedbackByDate, deleteFeedbackRecord, toast]);

  // 打开备注对话框
  const openNotesDialog = (student: { id: string, name: string }) => {
    const feedback = getStudentFeedback(student.id);
    setCurrentNotesStudent(student);
    setNotesInput(feedback?.notes || '');
    setNotesDialogOpen(true);
  };

  // 保存备注
  const handleSaveNotes = () => {
    if (currentNotesStudent) {
      const feedback = getStudentFeedback(currentNotesStudent.id);
      const currentMood = feedback?.mood || 'neutral';
      handleLocalFeedback(currentNotesStudent.id, currentMood, notesInput);
    }
    setNotesDialogOpen(false);
    setCurrentNotesStudent(null);
    setNotesInput('');
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
            getActivityColor(activity)
          )}>
            {activity > 99 ? "99+" : activity}
          </div>
        )}
      </div>
    );
  };

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
    <div className="space-y-6">
      {/* 模块导航 */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            反馈日历
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="flex items-center gap-2" disabled>
            <BarChart3 className="w-4 h-4" />
            学员分层
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            反馈计划
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-2" disabled>
            <MessageCircle className="w-4 h-4" />
            反馈话术
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">反馈日历</h2>
              <p className="text-muted-foreground mt-1">记录和分析每日与家长的反馈沟通情况</p>
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
              {hasUnsavedChanges && (
                <Badge variant="outline" className="px-3 py-1 border-orange-500 text-orange-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {Object.keys(pendingFeedbacks).length} 条未保存
                </Badge>
              )}
              <Button 
                onClick={handleClearTodayFeedbacks}
                disabled={isSaving || todayFeedbacks.length === 0}
                variant="outline"
                className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                清空当日反馈
              </Button>
              <Button 
                onClick={handleSaveAll}
                disabled={!hasUnsavedChanges || isSaving}
                className="flex items-center gap-2"
                variant={hasUnsavedChanges ? "default" : "outline"}
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存所有反馈'}
              </Button>
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
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>1-10条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                        <span>11-20条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>21-30条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>31-40条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>41-50条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>51-60条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                        <span>61-70条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>71-80条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span>81-90条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                        <span>91-100条</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-800 rounded-full"></div>
                        <span>100+条</span>
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredStudents.map(student => {
                      const feedback = getStudentFeedback(student.id!);
                      
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.class}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* 已反馈状态提示 */}
                            {(feedback || pendingFeedbacks[student.id!]) && (
                              <div className="text-xs text-muted-foreground mr-1">
                                {pendingFeedbacks[student.id!] ? (
                                  <span className="text-orange-600">● 待保存</span>
                                ) : (
                                  <span className="text-green-600">● 已反馈</span>
                                )}
                              </div>
                            )}
                            
                            {/* 快速反馈按钮 */}
                            {Object.entries(moodIcons).map(([mood, config]) => {
                              const Icon = config.icon;
                              const isActive = feedback?.mood === mood;
                              
                              return (
                                <Button
                                  key={mood}
                                  size="sm"
                                  variant={isActive ? "default" : "outline"}
                                  onClick={() => handleLocalFeedback(student.id!, mood as any)}
                                  className={cn(
                                    "flex items-center gap-1 h-8 px-2",
                                    isActive && "shadow-md"
                                  )}
                                  title={`设置为${config.label}`}
                                >
                                  <Icon className={cn("w-4 h-4", config.color)} />
                                </Button>
                              );
                            })}

                            {/* 备注按钮 */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              title="添加备注"
                              onClick={() => openNotesDialog({ id: student.id!, name: student.name })}
                            >
                              <MessageSquare className="w-4 h-4" />
                              {feedback?.notes && <div className="w-1 h-1 bg-primary rounded-full ml-1" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 备注编辑对话框 */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>编辑反馈备注</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">学生姓名</label>
                <div className="text-muted-foreground">{currentNotesStudent?.name}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">反馈备注</label>
                <Textarea
                  placeholder="请输入反馈备注..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveNotes}>
                保存备注
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 其他模块的占位内容 */}
        <TabsContent value="segmentation" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                学员分层
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>学员分层功能正在开发中...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <FeedbackPlanning 
            students={students}
            feedbackRecords={feedbackRecords}
            saveFeedbackRecord={saveFeedbackRecord}
          />
        </TabsContent>

        <TabsContent value="scripts" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent" />
                反馈话术
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>反馈话术功能正在开发中...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// 反馈计划组件
interface FeedbackPlanningProps {
  students: Student[];
  feedbackRecords: any[];
  saveFeedbackRecord: (record: Omit<FeedbackRecord, 'id'>) => Promise<any>;
}

const FeedbackPlanning = ({ students, feedbackRecords, saveFeedbackRecord }: FeedbackPlanningProps) => {
  const [startDate, setStartDate] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(() => endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [periodLength, setPeriodLength] = useState<number>(7); // 周期长度（天）
  const [periodMode, setPeriodMode] = useState<'preset' | 'custom'>('preset');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [pendingFeedbacks, setPendingFeedbacks] = useState<Record<string, { mood: 'happy' | 'neutral' | 'sad', notes?: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [planningNotesDialogOpen, setPlanningNotesDialogOpen] = useState(false);
  const [planningCurrentNotesStudent, setPlanningCurrentNotesStudent] = useState<{ id: string, name: string } | null>(null);
  const [planningNotesInput, setPlanningNotesInput] = useState('');
  const { toast } = useToast();

  const moodIcons = {
    happy: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 border-green-200', label: '高兴' },
    neutral: { icon: Meh, color: 'text-amber-500', bgColor: 'bg-amber-50 border-amber-200', label: '一般' },
    sad: { icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 border-red-200', label: '沮丧' }
  };

  // 预设周期选项
  const periodPresets = [
    { label: '1周', days: 7 },
    { label: '2周', days: 14 },
    { label: '1个月', days: 30 },
    { label: '2个月', days: 60 },
  ];

  // 设置预设周期
  const setPeriodPreset = (days: number) => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = new Date(start.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    setStartDate(start);
    setEndDate(end);
    setPeriodLength(days);
    setPeriodMode('preset');
  };

  // 自定义日期范围
  const handleCustomDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setPeriodLength(diffDays);
    setPeriodMode('custom');
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

  // 获取学生在当前周期内的反馈记录
  const getStudentPeriodFeedbacks = (studentId: string) => {
    return feedbackRecords.filter(record => {
      if (record.student_id !== studentId) return false;
      const recordDate = new Date(record.feedback_date);
      return isWithinInterval(recordDate, { start: startDate, end: endDate });
    });
  };

  // 获取学生的反馈状态
  const getStudentFeedbackStatus = (studentId: string) => {
    const periodFeedbacks = getStudentPeriodFeedbacks(studentId);
    const pendingFeedback = pendingFeedbacks[studentId];
    
    return {
      feedbackCount: periodFeedbacks.length,
      hasFeedback: periodFeedbacks.length > 0 || !!pendingFeedback,
      lastFeedback: periodFeedbacks[0], // 最新的反馈
      pendingFeedback
    };
  };

  // 按班级分组统计
  const getClassStats = () => {
    const stats = new Map();
    
    allClasses.forEach(className => {
      const classStudents = students.filter(s => s.class === className);
      const totalStudents = classStudents.length;
      const feedbackedStudents = classStudents.filter(student => {
        const status = getStudentFeedbackStatus(student.id!);
        return status.hasFeedback;
      }).length;
      
      stats.set(className, {
        totalStudents,
        feedbackedStudents,
        percentage: totalStudents > 0 ? Math.round((feedbackedStudents / totalStudents) * 100) : 0
      });
    });
    
    return stats;
  };

  // 设置本地反馈状态
  const handleLocalFeedback = useCallback((studentId: string, mood: 'happy' | 'neutral' | 'sad', notes?: string) => {
    setPendingFeedbacks(prev => ({
      ...prev,
      [studentId]: { mood, notes: notes?.trim() || undefined }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // 批量保存反馈
  const handleSaveAll = useCallback(async () => {
    if (Object.keys(pendingFeedbacks).length === 0) {
      toast({
        title: "没有需要保存的反馈",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const savePromises = Object.entries(pendingFeedbacks).map(async ([studentId, feedback]) => {
        try {
          const feedbackData: Omit<FeedbackRecord, 'id'> = {
            student_id: studentId,
            feedback_date: today,
            mood: feedback.mood,
            notes: feedback.notes
          };

          await saveFeedbackRecord(feedbackData);
          successCount++;
        } catch (error) {
          errorCount++;
          throw error;
        }
      });

      await Promise.all(savePromises);
      
      setPendingFeedbacks({});
      setHasUnsavedChanges(false);
      
      toast({
        title: "保存成功",
        description: `成功保存了 ${successCount} 条反馈`,
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: `成功: ${successCount} 条，失败: ${errorCount} 条`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [pendingFeedbacks, saveFeedbackRecord, toast]);

  // 打开备注对话框
  const openPlanningNotesDialog = (student: { id: string, name: string }) => {
    const status = getStudentFeedbackStatus(student.id);
    const currentNotes = status.pendingFeedback?.notes || status.lastFeedback?.notes || '';
    setPlanningCurrentNotesStudent(student);
    setPlanningNotesInput(currentNotes);
    setPlanningNotesDialogOpen(true);
  };

  // 保存备注
  const handleSavePlanningNotes = () => {
    if (planningCurrentNotesStudent) {
      const status = getStudentFeedbackStatus(planningCurrentNotesStudent.id);
      const currentMood = status.pendingFeedback?.mood || status.lastFeedback?.mood || 'neutral';
      handleLocalFeedback(planningCurrentNotesStudent.id, currentMood, planningNotesInput);
    }
    setPlanningNotesDialogOpen(false);
    setPlanningCurrentNotesStudent(null);
    setPlanningNotesInput('');
  };

  const classStats = getClassStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">反馈计划</h2>
          <p className="text-muted-foreground mt-1">按周期管理学生反馈进度，确保每位学生都能及时获得反馈</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="px-3 py-1 border-orange-500 text-orange-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {Object.keys(pendingFeedbacks).length} 条待保存
            </Badge>
          )}
          <Button 
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2"
            variant={hasUnsavedChanges ? "default" : "outline"}
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存所有反馈'}
          </Button>
        </div>
      </div>

      {/* 顶部反馈周期设置 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            反馈周期设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 预设周期 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">预设周期</span>
                <span className="text-muted-foreground">{periodLength}天</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {periodPresets.map((preset) => (
                  <Button
                    key={preset.days}
                    size="sm"
                    variant={periodMode === 'preset' && periodLength === preset.days ? "default" : "outline"}
                    onClick={() => setPeriodPreset(preset.days)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 自定义日期范围 */}
            <div className="space-y-3">
              <div className="text-sm font-medium">自定义日期范围</div>
              <div className="flex items-center gap-2">
                <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {format(startDate, 'MM/dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          handleCustomDateRange(date, endDate);
                          setStartDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">至</span>
                <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {format(endDate, 'MM/dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          handleCustomDateRange(startDate, date);
                          setEndDatePickerOpen(false);
                        }
                      }}
                      disabled={(date) => date < startDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground">
                  {format(startDate, 'MM月dd日', { locale: zhCN })} - {format(endDate, 'MM月dd日', { locale: zhCN })}
                </span>
              </div>
            </div>

            {/* 周期统计概览 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">周期统计</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-medium text-lg">{students.length}</div>
                  <div className="text-muted-foreground">总学生数</div>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <div className="font-medium text-lg text-green-600">
                    {Array.from(classStats.values()).reduce((sum, stats) => sum + stats.feedbackedStudents, 0)}
                  </div>
                  <div className="text-muted-foreground">已反馈数</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 底部左右并排布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* 左侧：各班级反馈进度 */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              各班级反馈进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 h-[480px] overflow-y-auto pr-2">
              {Array.from(classStats.entries()).map(([className, stats]) => (
                <button
                  key={className}
                  className="w-full p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors space-y-3"
                  onClick={() => setFilterClass(className)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-left hover:text-primary transition-colors">
                      {className}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {stats.feedbackedStudents}/{stats.totalStudents}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-3 transition-all duration-300"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-medium text-primary">
                      {stats.percentage}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 右侧：学生反馈管理 */}
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 h-[380px] overflow-y-auto pr-2">
              {filteredStudents.map(student => {
                const status = getStudentFeedbackStatus(student.id!);
                
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {status.hasFeedback ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.class} • 本期反馈 {status.feedbackCount} 次
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 反馈状态提示 */}
                      {status.pendingFeedback && (
                        <span className="text-xs text-orange-600 mr-1">● 待保存</span>
                      )}
                      {status.hasFeedback && !status.pendingFeedback && (
                        <span className="text-xs text-green-600 mr-1">● 已反馈</span>
                      )}
                      
                      {/* 快速反馈按钮 */}
                      {Object.entries(moodIcons).map(([mood, config]) => {
                        const Icon = config.icon;
                        const isActive = status.pendingFeedback?.mood === mood || 
                                        (!status.pendingFeedback && status.lastFeedback?.mood === mood);
                        
                        return (
                          <Button
                            key={mood}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            onClick={() => handleLocalFeedback(student.id!, mood as any)}
                            className={cn(
                              "flex items-center gap-1 h-8 px-2",
                              isActive && "shadow-md"
                            )}
                            title={`设置为${config.label}`}
                          >
                            <Icon className={cn("w-4 h-4", config.color)} />
                          </Button>
                        );
                      })}

                      {/* 备注按钮 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        title="添加备注"
                        onClick={() => openPlanningNotesDialog({ id: student.id!, name: student.name })}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {(status.pendingFeedback?.notes || status.lastFeedback?.notes) && 
                          <div className="w-1 h-1 bg-primary rounded-full ml-1" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 备注编辑对话框 */}
      <Dialog open={planningNotesDialogOpen} onOpenChange={setPlanningNotesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑反馈备注</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">学生姓名</label>
              <div className="text-muted-foreground">{planningCurrentNotesStudent?.name}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">反馈备注</label>
              <Textarea
                placeholder="请输入反馈备注..."
                value={planningNotesInput}
                onChange={(e) => setPlanningNotesInput(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanningNotesDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePlanningNotes}>
              保存备注
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackSystem;