import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tag, 
  Users, 
  Settings, 
  Check, 
  X, 
  Play, 
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Save
} from 'lucide-react';
import { Student } from '@/hooks/useStudentData';

interface TagTemplate {
  id?: string;
  name: string;
  options: string[];
  created_at?: Date;
}

interface TagAssignment {
  student_id: string;
  option: string;
}

interface TagGeneratorProps {
  students: Student[];
  onClose: () => void;
}

const TagGenerator = ({ students, onClose }: TagGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [tagTemplates, setTagTemplates] = useState<TagTemplate[]>([]);
  
  // 创建标签相关状态
  const [tagName, setTagName] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>(['选项1', '选项2']);
  
  // 分配标签相关状态
  const [currentTemplate, setCurrentTemplate] = useState<TagTemplate | null>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [currentAssignments, setCurrentAssignments] = useState<TagAssignment[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const { toast: toastHook } = useToast();

  // 加载现有的标签模板
  useEffect(() => {
    if (!user) return;
    loadTagTemplates();
  }, [user]);

  const loadTagTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'options')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const templates: TagTemplate[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        options: item.description ? JSON.parse(item.description) : [],
        created_at: new Date(item.created_at)
      }));

      setTagTemplates(templates);
    } catch (error: any) {
      console.error('Error loading tag templates:', error);
      toast({
        title: "加载失败",
        description: "无法加载标签模板",
        variant: "destructive",
      });
    }
  };

  const handleAddOption = () => {
    setTagOptions([...tagOptions, `选项${tagOptions.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (tagOptions.length > 2) {
      setTagOptions(tagOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...tagOptions];
    newOptions[index] = value;
    setTagOptions(newOptions);
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      toast({
        title: "错误",
        description: "请输入标签名称",
        variant: "destructive",
      });
      return;
    }

    if (tagOptions.some(opt => !opt.trim())) {
      toast({
        title: "错误", 
        description: "所有选项都必须填写",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .insert([{
          user_id: user.id,
          name: tagName,
          type: 'options',
          description: JSON.stringify(tagOptions)
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "创建成功",
        description: `标签 "${tagName}" 已创建`,
      });

      // 重置表单
      setTagName('');
      setTagOptions(['选项1', '选项2']);
      
      // 重新加载模板列表
      loadTagTemplates();
    } catch (error: any) {
      console.error('Error creating tag template:', error);
      toast({
        title: "创建失败",
        description: "创建标签时发生错误",
        variant: "destructive",
      });
    }
  };

  const startTagAssignment = (template: TagTemplate) => {
    setCurrentTemplate(template);
    setCurrentStudentIndex(0);
    setCurrentAssignments([]);
    setIsAssigning(true);
  };

  const handleAssignOption = (option: string) => {
    const currentStudent = students[currentStudentIndex];
    const newAssignment: TagAssignment = {
      student_id: currentStudent.id!,
      option: option
    };

    const updatedAssignments = [
      ...currentAssignments.filter(a => a.student_id !== currentStudent.id),
      newAssignment
    ];
    
    setCurrentAssignments(updatedAssignments);

    // 自动移动到下一个学生
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const saveAssignments = async () => {
    if (!currentTemplate || currentAssignments.length === 0) return;

    try {
      // 先删除已有的分配记录
      await supabase
        .from('student_field_values')
        .delete()
        .eq('field_id', currentTemplate.id);

      // 插入新的分配记录
      const insertData = currentAssignments.map(assignment => ({
        student_id: assignment.student_id,
        field_id: currentTemplate.id,
        value: assignment.option
      }));

      const { error } = await supabase
        .from('student_field_values')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "保存成功",
        description: `已为 ${currentAssignments.length} 名学生分配标签选项`,
      });

      setIsAssigning(false);
      setCurrentTemplate(null);
    } catch (error: any) {
      console.error('Error saving assignments:', error);
      toast({
        title: "保存失败",
        description: "保存标签分配时发生错误",
        variant: "destructive",
      });
    }
  };

  const getCurrentStudentAssignment = () => {
    const currentStudent = students[currentStudentIndex];
    return currentAssignments.find(a => a.student_id === currentStudent?.id)?.option || null;
  };

  const getAssignedCount = () => {
    return currentAssignments.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">标签生成器</h2>
          <p className="text-muted-foreground">创建带选项的标签并为学生分配</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          关闭
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            创建标签
          </TabsTrigger>
          <TabsTrigger value="assign" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            分配标签
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            管理标签
          </TabsTrigger>
        </TabsList>

        {/* 创建标签 */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                创建新标签
              </CardTitle>
              <CardDescription>
                设置标签名称和可选的选项，学生将从这些选项中选择一个
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tag-name">标签名称</Label>
                <Input
                  id="tag-name"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="例如：学习水平、兴趣类型..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label>标签选项</Label>
                <div className="space-y-3 mt-2">
                  {tagOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`选项 ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        disabled={tagOptions.length <= 2}
                        className="px-3"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOption}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    添加选项
                  </Button>
                </div>
              </div>

              <Button onClick={handleCreateTag} className="w-full">
                创建标签
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分配标签 */}
        <TabsContent value="assign" className="space-y-6">
          {!isAssigning ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  选择要分配的标签
                </CardTitle>
                <CardDescription>
                  选择一个标签模板，然后为每个学生分配对应的选项
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tagTemplates.length > 0 ? tagTemplates.map(template => (
                    <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{template.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.options.map(option => (
                              <Badge key={option} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          onClick={() => startTagAssignment(template)}
                          size="sm"
                          className="ml-4"
                        >
                          开始分配
                        </Button>
                      </div>
                    </Card>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无标签模板</p>
                      <p className="text-sm">请先创建标签模板</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 分配进度 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{currentTemplate?.name}</CardTitle>
                    <Badge variant="outline">
                      已分配: {getAssignedCount()} / {students.length}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* 当前学生 */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl">
                        {students[currentStudentIndex]?.name}
                      </CardTitle>
                      <CardDescription>
                        班级: {students[currentStudentIndex]?.class} | 
                        学生 {currentStudentIndex + 1} / {students.length}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousStudent}
                        disabled={currentStudentIndex === 0}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextStudent}
                        disabled={currentStudentIndex === students.length - 1}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label>选择适合该学生的选项：</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {currentTemplate?.options.map(option => {
                        const isSelected = getCurrentStudentAssignment() === option;
                        return (
                          <Button
                            key={option}
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleAssignOption(option)}
                            className="h-auto p-4 text-left justify-start"
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <Check className="w-4 h-4" />}
                              <span>{option}</span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsAssigning(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={saveAssignments}
                  disabled={currentAssignments.length === 0}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存分配 ({getAssignedCount()})
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 管理标签 */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                标签模板管理
              </CardTitle>
              <CardDescription>
                查看和管理已创建的标签模板
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tagTemplates.length > 0 ? tagTemplates.map(template => (
                  <Card key={template.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{template.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {template.options.map(option => (
                            <Badge key={option} variant="secondary">
                              {option}
                            </Badge>
                          ))}
                        </div>
                        {template.created_at && (
                          <p className="text-sm text-muted-foreground mt-2">
                            创建时间: {template.created_at.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无标签模板</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TagGenerator;