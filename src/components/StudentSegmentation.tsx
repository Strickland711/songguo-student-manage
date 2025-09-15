import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smile, Meh, Frown, Users, Settings, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/hooks/useStudentData';
import { FeedbackRecord } from '@/hooks/useFeedbackData';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudentSegmentationProps {
  students: Student[];
  feedbackRecords: FeedbackRecord[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
}

interface ScoreSettings {
  happy: number;
  neutral: number;
  sad: number;
}

interface ScoreRange {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
}

interface DraggableStudentProps {
  student: Student & { totalScore: number };
  isDragging?: boolean;
}

const DraggableStudent = ({ student, isDragging }: DraggableStudentProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: student.id! });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex flex-col items-center justify-center p-3 bg-background border rounded-md cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 transition-colors text-sm min-w-0",
        isDragging ? 'opacity-50' : ''
      )}
    >
      <span className="font-medium truncate">{student.name}</span>
      <span className="text-xs text-muted-foreground">{student.class}</span>
      <Badge variant="outline" className="text-xs mt-1">
        {student.totalScore} 分
      </Badge>
    </div>
  );
};

interface DroppableGroupProps {
  range: ScoreRange;
  students: (Student & { totalScore: number })[];
  onEditRange: (range: ScoreRange) => void;
  onDeleteRange: (rangeId: string) => void;
}

const DroppableGroup = ({ range, students, onEditRange, onDeleteRange }: DroppableGroupProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(range.name);

  const { isOver, setNodeRef } = useDroppable({
    id: range.id,
  });

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== range.name) {
      onEditRange({
        ...range,
        name: editName.trim()
      });
    }
    setIsEditing(false);
    setEditName(range.name);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(range.name);
  };

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "transition-colors rounded-lg",
        isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      )}
    >
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: range.color }}
                  />
                  <CardTitle className="text-lg">{range.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="p-1 h-6 w-6"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {range.minScore}-{range.maxScore === Infinity ? '∞' : range.maxScore} 分
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {students.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteRange(range.id)}
                className="p-1 h-6 w-6 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">暂无学生</p>
                <p className="text-xs">可从其他分组拖拽学生到此处</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {students.map(student => (
                  <DraggableStudent key={student.id} student={student} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StudentSegmentation = ({ students, feedbackRecords, onUpdateStudents }: StudentSegmentationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scoreSettings, setScoreSettings] = useState<ScoreSettings>({
    happy: 3,
    neutral: 2,
    sad: 1
  });
  
  const [scoreRanges, setScoreRanges] = useState<ScoreRange[]>([]);

  const [newRangeName, setNewRangeName] = useState('');
  const [newRangeMin, setNewRangeMin] = useState<number>(0);
  const [newRangeMax, setNewRangeMax] = useState<number>(100);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 减少激活距离，提高响应速度
      }
    })
  );

  // 计算学生的总分
  const studentsWithScores = useMemo(() => {
    return students.map(student => {
      const studentFeedbacks = feedbackRecords.filter(f => f.student_id === student.id);
      const totalScore = studentFeedbacks.reduce((sum, feedback) => {
        return sum + scoreSettings[feedback.mood as keyof ScoreSettings];
      }, 0);
      
      return {
        ...student,
        totalScore
      };
    });
  }, [students, feedbackRecords, scoreSettings]);

  // 按分数范围分组学生（初始分组，之后可自由调整）
  const groupedStudents = useMemo(() => {
    const groups = new Map();
    
    // 首先从学生的自定义字段中获取已有分组信息
    const studentsWithGroups = new Map();
    studentsWithScores.forEach(student => {
      const groupName = student['分组'] || null;
      if (groupName) {
        if (!studentsWithGroups.has(groupName)) {
          studentsWithGroups.set(groupName, []);
        }
        studentsWithGroups.get(groupName).push(student);
      }
    });
    
    // 为已有分组设置学生
    scoreRanges.forEach(range => {
      if (studentsWithGroups.has(range.name)) {
        groups.set(range.id, studentsWithGroups.get(range.name));
      } else {
        // 如果是新创建的分组，按分数筛选学生（仅未分组的学生）
        const ungroupedStudents = studentsWithScores.filter(student => !student['分组']);
        const studentsInRange = ungroupedStudents.filter(student => {
          const score = student.totalScore;
          return score >= range.minScore && (range.maxScore === Infinity || score <= range.maxScore);
        });
        groups.set(range.id, studentsInRange);
      }
    });
    
    return groups;
  }, [studentsWithScores, scoreRanges]);

  // 更新表情分数设置
  const handleScoreChange = (mood: keyof ScoreSettings, value: number[]) => {
    setScoreSettings(prev => ({
      ...prev,
      [mood]: value[0]
    }));
  };

  // 添加新分组
  const handleAddRange = () => {
    if (!newRangeName.trim()) return;
    
    const newRange: ScoreRange = {
      id: `range_${Date.now()}`,
      name: newRangeName.trim(),
      minScore: newRangeMin,
      maxScore: newRangeMax === 999 ? Infinity : newRangeMax,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
    };
    
    setScoreRanges(prev => [...prev, newRange]);
    setNewRangeName('');
    setNewRangeMin(0);
    setNewRangeMax(100);
  };

  // 编辑分组
  const handleEditRange = (updatedRange: ScoreRange) => {
    setScoreRanges(prev => 
      prev.map(range => 
        range.id === updatedRange.id ? updatedRange : range
      )
    );
  };

  // 删除分组
  const handleDeleteRange = (rangeId: string) => {
    if (scoreRanges.length <= 1) {
      toast({
        title: "删除失败",
        description: "至少需要保留一个分组",
        variant: "destructive",
      });
      return;
    }
    
    setScoreRanges(prev => prev.filter(range => range.id !== rangeId));
  };

  // 保存分组信息作为标签
  const saveGroupingAsTag = async (studentId: string, groupName: string) => {
    if (!user) return;

    try {
      // 保存分组名称到学生的自定义字段中
      // 首先检查是否存在"分组"自定义字段
      let { data: existingField } = await supabase
        .from('custom_fields')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', '分组')
        .single();

      let fieldId = existingField?.id;

      // 如果不存在，创建"分组"自定义字段
      if (!fieldId) {
        const { data: newField, error: fieldError } = await supabase
          .from('custom_fields')
          .insert({
            user_id: user.id,
            name: '分组',
            type: 'text'
          })
          .select()
          .single();

        if (fieldError) throw fieldError;
        fieldId = newField.id;
      }

      // 保存分组值
      const { error: valueError } = await supabase
        .from('student_field_values')
        .upsert({
          student_id: studentId,
          field_id: fieldId,
          value: groupName
        }, {
          onConflict: 'student_id,field_id'
        });

      if (valueError) throw valueError;

    } catch (error: any) {
      console.error('保存分组标签失败:', error);
      throw error;
    }
  };

  // 处理拖拽开始
  const handleDragStart = (event: any) => {
    setDraggedStudentId(event.active.id);
  };

  // 处理拖拽结束 - 优化版本
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDraggedStudentId(null);
    
    if (!over) return;
    
    const draggedStudentId = active.id as string;
    const targetRangeId = over.id as string;
    
    const draggedStudent = studentsWithScores.find(s => s.id === draggedStudentId);
    const targetRange = scoreRanges.find(r => r.id === targetRangeId);
    
    if (!draggedStudent || !targetRange) return;

    // 检查是否需要更新
    const currentGroup = draggedStudent['分组'];
    if (currentGroup === targetRange.name) return;

    try {
      // 异步保存分组信息
      await saveGroupingAsTag(draggedStudentId, targetRange.name);
      
      toast({
        title: "分组更新成功",
        description: `${draggedStudent.name} 已移动到 ${targetRange.name} 分组`,
      });
    } catch (error) {
      toast({
        title: "分组更新失败",
        description: "更新分组信息时发生错误，请重试",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">学员分层</h2>
          <p className="text-muted-foreground mt-1">根据反馈记录分数对学生进行分层管理，支持拖拽调整分组</p>
        </div>
      </div>

      {/* 分数设置 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            表情分数设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-green-500" />
                <span className="font-medium">高兴</span>
              </div>
              <Slider
                value={[scoreSettings.happy]}
                onValueChange={(value) => handleScoreChange('happy', value)}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                {scoreSettings.happy} 分
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Meh className="w-5 h-5 text-amber-500" />
                <span className="font-medium">一般</span>
              </div>
              <Slider
                value={[scoreSettings.neutral]}
                onValueChange={(value) => handleScoreChange('neutral', value)}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                {scoreSettings.neutral} 分
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Frown className="w-5 h-5 text-red-500" />
                <span className="font-medium">沮丧</span>
              </div>
              <Slider
                value={[scoreSettings.sad]}
                onValueChange={(value) => handleScoreChange('sad', value)}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                {scoreSettings.sad} 分
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加新分组 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>添加分组</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">分组名称</label>
              <Input
                value={newRangeName}
                onChange={(e) => setNewRangeName(e.target.value)}
                placeholder="输入分组名称"
              />
            </div>
            <div className="w-24">
              <label className="text-sm font-medium mb-2 block">最小分数</label>
              <Input
                type="number"
                value={newRangeMin}
                onChange={(e) => setNewRangeMin(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="w-24">
              <label className="text-sm font-medium mb-2 block">最大分数</label>
              <Input
                type="number"
                value={newRangeMax}
                onChange={(e) => setNewRangeMax(Number(e.target.value))}
                min={0}
                placeholder="999表示无上限"
              />
            </div>
            <Button onClick={handleAddRange} disabled={!newRangeName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              添加分组
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 学生分组显示 */}
      {scoreRanges.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">暂无分组</h3>
              <p className="text-sm text-muted-foreground mt-2">请先添加分组来管理学生</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {scoreRanges.map(range => {
              const studentsInRange = groupedStudents.get(range.id) || [];
              return (
                <DroppableGroup
                  key={range.id}
                  range={range}
                  students={studentsInRange}
                  onEditRange={handleEditRange}
                  onDeleteRange={handleDeleteRange}
                />
              );
            })}
          </div>
        </DndContext>
      )}
          
          <DragOverlay>
            {draggedStudentId ? (
              <div className="flex flex-col items-center justify-center p-3 bg-primary text-primary-foreground border rounded-md text-sm font-medium opacity-90">
                {studentsWithScores.find(s => s.id === draggedStudentId)?.name || '拖拽中...'}
              </div>
            ) : null}
          </DragOverlay>

      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <h4 className="font-medium mb-2">使用说明：</h4>
        <ul className="space-y-1 text-xs">
          <li>• 设置表情分数并添加分组来管理学生</li>
          <li>• 学生总分 = 所有反馈记录的分数之和</li>
          <li>• 新建分组时会按分数自动筛选未分组学生</li>
          <li>• 创建后可拖拽学生自由调整分组，不受分数限制</li>
          <li>• 分组信息会自动保存为学生标签</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentSegmentation;