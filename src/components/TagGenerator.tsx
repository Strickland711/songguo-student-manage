import { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('create');
  const [tagTemplates, setTagTemplates] = useState<TagTemplate[]>([]);
  
  // 创建标签相关状态
  const [tagName, setTagName] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>(['选项1', '选项2']);
  
  // 分配标签相关状态
  const [currentTemplate, setCurrentTemplate] = useState<TagTemplate | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<TagAssignment[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  const { toast: toastHook } = useToast();

  // 加载现有的标签模板
  useEffect(() => {
    if (!user) return;
    loadTagTemplates();
  }, [user]);

  // 更新筛选后的学生列表
  useEffect(() => {
    let filtered = students;

    // 按班级筛选
    if (classFilter.trim() && classFilter !== 'all') {
      filtered = filtered.filter(student => 
        student.class.toLowerCase().includes(classFilter.toLowerCase())
      );
    }

    // 按姓名筛选
    if (nameFilter.trim()) {
      filtered = filtered.filter(student => {
        const firstChar = student.name.charAt(0);
        const pinyin = surnameMap[firstChar];
        return (
          student.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
          (pinyin && pinyin.toLowerCase().includes(nameFilter.toLowerCase()))
        );
      });
    }

    setFilteredStudents(filtered);
  }, [students, nameFilter, classFilter]);

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
    setCurrentAssignments([]);
    setSelectedStudentId(null);
    setNameFilter('');
    setClassFilter('all');
    setIsAssigning(true);
  };

  const selectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleAssignOption = (option: string) => {
    if (!selectedStudentId) {
      toast({
        title: "请选择学生",
        description: "请先从右侧学生列表中选择一个学生",
        variant: "destructive",
      });
      return;
    }

    const newAssignment: TagAssignment = {
      student_id: selectedStudentId,
      option: option
    };

    const updatedAssignments = [
      ...currentAssignments.filter(a => a.student_id !== selectedStudentId),
      newAssignment
    ];
    
    setCurrentAssignments(updatedAssignments);

    toast({
      title: "分配成功",
      description: `已为学生分配选项: ${option}`,
    });
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

  const getStudentAssignment = (studentId: string) => {
    return currentAssignments.find(a => a.student_id === studentId)?.option || null;
  };

  const getSelectedStudent = () => {
    return selectedStudentId ? filteredStudents.find(s => s.id === selectedStudentId) : null;
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧 - 标签分配区域 */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{currentTemplate?.name}</CardTitle>
                      <Badge variant="outline">
                        已分配: {getAssignedCount()} / {filteredStudents.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="class-filter">按班级筛选</Label>
                      <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="选择班级..." />
                        </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部班级</SelectItem>
                          {Array.from(new Set(students.map(s => s.class).filter(Boolean))).map(className => (
                            <SelectItem key={className} value={className}>
                              {className}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="name-filter">按姓氏筛选学生</Label>
                      <Input
                        id="name-filter"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="输入姓氏首字母或姓名..."
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 当前选中学生的分配区域 */}
                {selectedStudentId && getSelectedStudent() && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">
                        {getSelectedStudent()?.name}
                      </CardTitle>
                      <CardDescription>
                        班级: {getSelectedStudent()?.class}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>当前分配的选项:</Label>
                          <div className="mt-2">
                            {getStudentAssignment(selectedStudentId) ? (
                              <Badge variant="secondary" className="text-sm">
                                {getStudentAssignment(selectedStudentId)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">尚未分配</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label>选择选项:</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {currentTemplate?.options.map(option => (
                              <Button
                                key={option}
                                variant={getStudentAssignment(selectedStudentId) === option ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAssignOption(option)}
                                className="flex items-center gap-2"
                              >
                                {getStudentAssignment(selectedStudentId) === option && (
                                  <Check className="w-4 h-4" />
                                )}
                                {option}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!selectedStudentId && (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>请从右侧学生列表中选择一个学生</p>
                        <p className="text-sm">然后为其分配标签选项</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setIsAssigning(false)}
                  >
                    返回
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

              {/* 右侧 - 学生列表 */}
              <div>
                <Card className="h-fit max-h-[70vh] overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">学生列表</CardTitle>
                    <CardDescription>
                      点击学生进行标签分配 ({filteredStudents.length} 名学生)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[50vh] overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        <div className="space-y-1 p-6 pt-0">
                          {filteredStudents.map((student) => {
                            const assignment = getStudentAssignment(student.id!);
                            const isSelected = selectedStudentId === student.id;
                            
                            return (
                              <div
                                key={student.id}
                                onClick={() => selectStudent(student.id!)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                  isSelected 
                                    ? 'border-primary bg-primary/5 shadow-md' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{student.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {student.class}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {assignment && (
                                      <Badge variant="secondary" className="text-xs">
                                        {assignment}
                                      </Badge>
                                    )}
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>没有找到匹配的学生</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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