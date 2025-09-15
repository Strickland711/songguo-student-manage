import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Edit2, Check, X, Users, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Student, CustomField } from '@/hooks/useStudentData';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
  DragOverlay,
} from '@dnd-kit/core';

interface TagDragSystemProps {
  students: Student[];
  customFields: CustomField[];
  onUpdateStudents: (students: Student[]) => Promise<void>;
}

interface DraggableStudentProps {
  student: Student;
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
        "flex items-center justify-center p-2 bg-background border rounded-md cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 transition-colors text-sm font-medium min-w-0",
        isDragging ? 'opacity-50' : ''
      )}
    >
      <span className="truncate">{student.name}</span>
    </div>
  );
};

interface DroppableFieldGroupProps {
  field: CustomField;
  values: string[];
  studentsMap: Map<string, Student[]>;
  onToggleExpand: (fieldName: string, value: string) => void;
  expandedGroups: Set<string>;
}

const DroppableFieldGroup = ({ field, values, studentsMap, onToggleExpand, expandedGroups }: DroppableFieldGroupProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-accent" />
          {field.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {values.map(value => {
          const groupKey = `${field.name}-${value}`;
          const isExpanded = expandedGroups.has(groupKey);
          const studentsInGroup = studentsMap.get(value) || [];
          
          return (
            <DroppableValueGroup
              key={value}
              fieldName={field.name}
              value={value}
              students={studentsInGroup}
              isExpanded={isExpanded}
              onToggleExpand={() => onToggleExpand(field.name, value)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};

interface DroppableValueGroupProps {
  fieldName: string;
  value: string;
  students: Student[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const DroppableValueGroup = ({ fieldName, value, students, isExpanded, onToggleExpand }: DroppableValueGroupProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${fieldName}::${value}`,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "transition-colors rounded-lg",
        isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      )}
    >
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50" onClick={onToggleExpand}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-medium">{value}</span>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {students.length}
          </Badge>
        </div>
        
        {isExpanded && (
          <div className="px-3 pb-3">
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
        )}
      </div>
    </div>
  );
};

const TagDragSystem = ({ students, customFields, onUpdateStudents }: TagDragSystemProps) => {
  const { toast } = useToast();
  const [selectedField, setSelectedField] = useState<CustomField | null>(customFields[0] || null);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 减少激活距离
      }
    })
  );

  // 按选中字段的值分组学生
  const { fieldValues, studentsMap } = useMemo(() => {
    if (!selectedField) return { fieldValues: [], studentsMap: new Map() };

    const valuesMap = new Map<string, Student[]>();
    
    students.forEach(student => {
      const value = student[selectedField.name] || '未设置';
      if (!valuesMap.has(value)) {
        valuesMap.set(value, []);
      }
      valuesMap.get(value)!.push(student);
    });

    const values = Array.from(valuesMap.keys()).sort();
    
    return {
      fieldValues: values,
      studentsMap: valuesMap
    };
  }, [students, selectedField]);

  // 切换分组展开/收起
  const toggleGroupExpansion = (fieldName: string, value: string) => {
    const groupKey = `${fieldName}-${value}`;
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
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
    const dropTarget = over.id as string;
    
    // 解析目标：fieldName::value
    const [targetFieldName, targetValue] = dropTarget.split('::');
    
    if (!selectedField || targetFieldName !== selectedField.name) return;
    
    const draggedStudent = students.find(s => s.id === draggedStudentId);
    if (!draggedStudent) return;
    
    // 检查是否需要更新
    const currentValue = draggedStudent[selectedField.name];
    if (currentValue === targetValue) return;
    
    // 保存原始状态用于回退
    const originalStudents = [...students];
    
    // 乐观更新：先更新本地状态
    const updatedStudents = students.map(student => 
      student.id === draggedStudentId 
        ? { ...student, [selectedField.name]: targetValue === '未设置' ? undefined : targetValue }
        : student
    );
    
    try {
      // 异步保存到数据库
      await onUpdateStudents(updatedStudents);
      
      toast({
        title: "更新成功",
        description: `${draggedStudent.name} 的 ${selectedField.name} 已更新为 ${targetValue}`,
      });
    } catch (error) {
      // 如果失败，恢复原始状态
      await onUpdateStudents(originalStudents);
      toast({
        title: "更新失败",
        description: "更新学生信息时发生错误，请重试",
        variant: "destructive",
      });
    }
  };

  if (customFields.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12">
          <div className="text-center">
            <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">暂无自定义标签</h3>
            <p className="text-sm text-muted-foreground mt-2">请先在标签管理中添加自定义标签</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标签选择器 */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>选择标签进行管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {customFields.map(field => (
              <Button
                key={field.id}
                size="sm"
                variant={selectedField?.id === field.id ? "default" : "outline"}
                onClick={() => setSelectedField(field)}
                className="flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                {field.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 拖拽管理界面 */}
      {selectedField && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <DroppableFieldGroup
            field={selectedField}
            values={fieldValues}
            studentsMap={studentsMap}
            onToggleExpand={toggleGroupExpansion}
            expandedGroups={expandedGroups}
          />

          <DragOverlay>
            {draggedStudentId ? (
              <div className="flex items-center justify-center p-2 bg-primary text-primary-foreground border rounded-md text-sm font-medium opacity-90">
                {students.find(s => s.id === draggedStudentId)?.name || '拖拽中...'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <h4 className="font-medium mb-2">使用说明：</h4>
        <ul className="space-y-1 text-xs">
          <li>• 点击标签按钮选择要管理的标签字段</li>
          <li>• 点击分组名称可以展开/收起查看学生列表</li>
          <li>• 拖拽学生卡片到不同分组可以修改学生的标签值</li>
          <li>• 所有变更会自动保存到数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default TagDragSystem;