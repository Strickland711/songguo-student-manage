import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smile, Meh, Frown, MessageSquare, Users, Calendar as CalendarIcon, Filter, BarChart3, Target, MessageCircle, Settings, Save, AlertTriangle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFeedbackData, FeedbackRecord } from '@/hooks/useFeedbackData';
import { useStudentData, Student } from '@/hooks/useStudentData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FeedbackSystemProps {
  students: Student[];
}

const FeedbackSystem = ({ students }: FeedbackSystemProps) => {
  const { feedbackRecords, loading, saveFeedbackRecord, getFeedbackByDate } = useFeedbackData();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [pendingFeedbacks, setPendingFeedbacks] = useState<Record<string, { mood: 'happy' | 'neutral' | 'sad', notes?: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
          <TabsTrigger value="planning" className="flex items-center gap-2" disabled>
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
                              onClick={() => {
                                const notes = prompt('请输入反馈备注:', feedback?.notes || '');
                                if (notes !== null) {
                                  const currentMood = feedback?.mood || 'neutral';
                                  handleLocalFeedback(student.id!, currentMood, notes);
                                }
                              }}
                            >
                              <MessageSquare className="w-4 h-4" />
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
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                反馈计划
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>反馈计划功能正在开发中...</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

export default FeedbackSystem;