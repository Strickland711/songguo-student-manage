import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Edit2, Check, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/hooks/useStudentData';
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

interface ClassData {
  name: string;
  students: Student[];
  expanded: boolean;
}

interface ClassSpaceProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
  onUpdateStudentClass: (studentId: string, newClass: string) => Promise<boolean>;
  onUpdateClassName: (oldName: string, newName: string) => Promise<boolean>;
  onStudentDoubleClick?: (student: Student) => void;
}

interface DraggableStudentProps {
  student: Student;
  isDragging?: boolean;
  onDoubleClick?: (student: Student) => void;
}

const DraggableStudent = ({ student, isDragging, onDoubleClick }: DraggableStudentProps) => {
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
      className={`
        flex items-center justify-center p-2 bg-background border rounded-md cursor-grab active:cursor-grabbing
        hover:border-primary/50 transition-colors text-sm font-medium min-w-0
        ${isDragging ? 'opacity-50' : ''}
      `}
      onDoubleClick={() => onDoubleClick?.(student)}
    >
      <span className="truncate">{student.name}</span>
    </div>
  );
};

interface DroppableClassProps {
  classData: ClassData;
  onToggleExpand: (className: string) => void;
  onEditClassName: (oldName: string, newName: string) => void;
  onStudentDoubleClick?: (student: Student) => void;
}

const DroppableClass = ({ classData, onToggleExpand, onEditClassName, onStudentDoubleClick }: DroppableClassProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(classData.name);

  const { isOver, setNodeRef } = useDroppable({
    id: classData.name,
  });

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== classData.name) {
      onEditClassName(classData.name, editName.trim());
    }
    setIsEditing(false);
    setEditName(classData.name);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(classData.name);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`${isOver ? 'ring-2 ring-primary/50 bg-primary/5 rounded-lg' : ''}`}
    >
      <Card className="shadow-card transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpand(classData.name)}
                className="p-1 h-6 w-6"
              >
                {classData.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 w-48"
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{classData.name}</CardTitle>
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
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {classData.students.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {classData.expanded && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {classData.students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">暂无学生</p>
                  <p className="text-xs">可从其他班级拖拽学生到此处</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {classData.students.map(student => (
                    <DraggableStudent 
                      key={student.id} 
                      student={student} 
                      onDoubleClick={onStudentDoubleClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

const ClassSpace = ({ students, onUpdateStudents, onUpdateStudentClass, onUpdateClassName, onStudentDoubleClick }: ClassSpaceProps) => {
  const { toast } = useToast();
  
  // 按班级分组学生数据
  const initialClassData = useMemo(() => {
    const classMap = new Map<string, Student[]>();
    
    students.forEach(student => {
      const className = student.class || '未分班';
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className)!.push(student);
    });
    
    return Array.from(classMap.entries()).map(([name, students]) => ({
      name,
      students,
      expanded: true,
    }));
  }, [students]);

  const [classDataList, setClassDataList] = useState<ClassData[]>(initialClassData);

  // 同步外部学生数据变化（优化版本）
  useEffect(() => {
    const classMap = new Map<string, Student[]>();
    
    students.forEach(student => {
      const className = student.class || '未分班';
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className)!.push(student);
    });
    
    const newClassDataList = Array.from(classMap.entries()).map(([name, studentsInClass]) => {
      const existingClass = classDataList.find(c => c.name === name);
      return {
        name,
        students: studentsInClass,
        expanded: existingClass ? existingClass.expanded : true,
      };
    });
    
    // 更精确的变化检测（避免不必要的重新渲染）
    const currentSnapshot = classDataList.map(c => ({ 
      name: c.name, 
      studentIds: c.students.map(s => s.id).sort(),
      expanded: c.expanded
    }));
    
    const newSnapshot = newClassDataList.map(c => ({ 
      name: c.name, 
      studentIds: c.students.map(s => s.id).sort(),
      expanded: c.expanded
    }));
    
    const hasChanged = JSON.stringify(currentSnapshot) !== JSON.stringify(newSnapshot);
      
    if (hasChanged) {
      setClassDataList(newClassDataList);
    }
  }, [students]); // 移除 classDataList 依赖以避免循环

  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  // 优化：仅更新单个学生班级（用于拖拽）
  const updateSingleStudentClass = async (studentId: string, newClassName: string) => {
    try {
      const actualClassName = newClassName === '未分班' ? '' : newClassName;
      await onUpdateStudentClass(studentId, actualClassName);
      
      toast({
        title: "移动成功",
        description: `学生已移动到 ${newClassName}`,
      });
    } catch (error) {
      toast({
        title: "移动失败",
        description: "学生移动失败，请重试",
        variant: "destructive",
      });
      // 重新加载数据以恢复状态
      throw error;
    }
  };

  // 处理拖拽开始
  const handleDragStart = (event: any) => {
    setDraggedStudentId(event.active.id);
  };

  // 处理拖拽悬停
  const handleDragOver = (event: DragOverEvent) => {
    // 允许拖拽到班级区域上方
  };

  // 处理拖拽结束（优化版本）
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDraggedStudentId(null); // 重置拖拽状态
    
    if (!over) return;
    
    const draggedStudentId = active.id as string;
    const targetClassName = over.id as string;
    
    // 找到被拖拽的学生和源班级
    let draggedStudent: Student | null = null;
    let sourceClassName = '';
    
    classDataList.forEach(classData => {
      const student = classData.students.find(s => s.id === draggedStudentId);
      if (student) {
        draggedStudent = student;
        sourceClassName = classData.name;
      }
    });
    
    if (!draggedStudent || sourceClassName === targetClassName) return;
    
    // 乐观更新：先更新本地状态
    const newClassDataList = classDataList.map(classData => {
      if (classData.name === sourceClassName) {
        return {
          ...classData,
          students: classData.students.filter(s => s.id !== draggedStudentId)
        };
      } else if (classData.name === targetClassName) {
        return {
          ...classData,
          students: [...classData.students, draggedStudent]
        };
      }
      return classData;
    });
    
    setClassDataList(newClassDataList);
    
    // 异步更新数据库
    try {
      await updateSingleStudentClass(draggedStudentId, targetClassName);
    } catch (error) {
      // 如果失败，恢复原始状态
      setClassDataList(classDataList);
    }
  };

  // 切换班级展开/收起
  const toggleClassExpansion = (className: string) => {
    setClassDataList(prev => 
      prev.map(classData => 
        classData.name === className 
          ? { ...classData, expanded: !classData.expanded }
          : classData
      )
    );
  };

  // 编辑班级名称（优化版本）
  const editClassName = async (oldName: string, newName: string) => {
    if (classDataList.some(c => c.name === newName && c.name !== oldName)) {
      toast({
        title: "班级名称重复",
        description: "该班级名称已存在，请使用其他名称",
        variant: "destructive",
      });
      return;
    }

    // 乐观更新：先更新本地状态
    const newClassDataList = classDataList.map(classData => 
      classData.name === oldName 
        ? { ...classData, name: newName }
        : classData
    );
    
    setClassDataList(newClassDataList);
    
    try {
      // 异步批量更新数据库中该班级的所有学生
      await onUpdateClassName(oldName === '未分班' ? '' : oldName, newName === '未分班' ? '' : newName);
      
      toast({
        title: "班级名称已更新",
        description: `已将班级 "${oldName}" 改名为 "${newName}"`,
      });
    } catch (error) {
      // 如果失败，恢复原始状态
      setClassDataList(classDataList);
    }
  };

  if (students.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">暂无学生数据</h3>
            <p className="text-sm text-muted-foreground mt-2">请先导入学生数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">班级空间</h2>
          <p className="text-muted-foreground mt-1">管理班级和学生，支持拖拽移动学生到不同班级</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            共 {classDataList.length} 个班级
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {students.length} 名学生
          </Badge>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid gap-4">
          {classDataList.map(classData => (
            <div key={classData.name}>
              <DroppableClass
                classData={classData}
                onToggleExpand={toggleClassExpansion}
                onEditClassName={editClassName}
                onStudentDoubleClick={onStudentDoubleClick}
              />
            </div>
          ))}
        </div>
      </DndContext>

      <DragOverlay>
        {draggedStudentId ? (
          <div className="flex items-center justify-center p-2 bg-primary text-primary-foreground border rounded-md text-sm font-medium opacity-90">
            {classDataList
              .flatMap(c => c.students)
              .find(s => s.id === draggedStudentId)?.name || '拖拽中...'}
          </div>
        ) : null}
      </DragOverlay>

      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <h4 className="font-medium mb-2">使用说明：</h4>
        <ul className="space-y-1 text-xs">
          <li>• 点击班级名称旁的编辑按钮可以修改班级名称</li>
          <li>• 点击箭头可以展开/收起班级查看学生列表</li>
          <li>• 拖拽学生卡片到其他班级可以移动学生</li>
          <li>• 双击学生卡片可以进入该学生的个人空间</li>
          <li>• 所有变更会自动保存到数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default ClassSpace;