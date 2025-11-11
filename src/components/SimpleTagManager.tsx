import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Tag, Copy, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TagData {
  id?: string;
  name: string;
  color: string;
  description?: string;
  class_mappings?: string[];
  created_at?: string;
}

interface CustomFieldData {
  id?: string;
  name: string;
  type: string;
  description?: string;
  formula?: string;
  formula_dependencies?: any;
  created_at?: string;
}

const SimpleTagManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagData[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldData[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [editingField, setEditingField] = useState<CustomFieldData | null>(null);
  const [formData, setFormData] = useState<Omit<TagData, 'id' | 'created_at'>>({
    name: '',
    color: '#3B82F6',
    description: '',
    class_mappings: []
  });
  const [fieldFormData, setFieldFormData] = useState<Omit<CustomFieldData, 'id' | 'created_at' | 'formula' | 'formula_dependencies'>>({
    name: '',
    type: 'text',
    description: ''
  });
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    if (user) {
      loadTags();
      loadCustomFields();
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('class')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const uniqueClasses = [...new Set(data?.map(s => s.class) || [])];
      setAvailableClasses(uniqueClasses);
    } catch (error: any) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadTags = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      toast({
        title: "加载标签失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadCustomFields = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error: any) {
      toast({
        title: "加载自定义字段失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: TagData, isCopy = false) => {
    if (tag) {
      setEditingTag(isCopy ? null : tag);
      setFormData({
        name: isCopy ? `${tag.name} (副本)` : tag.name,
        color: tag.color,
        description: tag.description || '',
        class_mappings: tag.class_mappings || []
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        color: '#3B82F6',
        description: '',
        class_mappings: []
      });
    }
    setNewClassName('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      toast({
        title: "错误",
        description: "标签名称不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTag) {
        const { error } = await supabase
          .from('tags')
          .update({
            name: formData.name,
            color: formData.color,
            description: formData.description || null,
            class_mappings: formData.class_mappings || []
          })
          .eq('id', editingTag.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "更新成功",
          description: `标签"${formData.name}"已更新`,
        });
      } else {
        const { error } = await supabase
          .from('tags')
          .insert({
            user_id: user.id,
            name: formData.name,
            color: formData.color,
            description: formData.description || null,
            class_mappings: formData.class_mappings || []
          });

        if (error) throw error;

        toast({
          title: "创建成功",
          description: `标签"${formData.name}"已创建`,
        });
      }

      setShowDialog(false);
      loadTags();
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tagId: string, tagName: string) => {
    if (!confirm(`确定要删除标签"${tagName}"吗？这将同时删除所有学生与该标签的关联。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "删除成功",
        description: `标签"${tagName}"已删除`,
      });

      loadTags();
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddClass = (className: string) => {
    if (!className.trim()) return;
    
    const currentMappings = formData.class_mappings || [];
    if (!currentMappings.includes(className)) {
      setFormData({
        ...formData,
        class_mappings: [...currentMappings, className]
      });
    }
  };

  const handleRemoveClass = (className: string) => {
    setFormData({
      ...formData,
      class_mappings: (formData.class_mappings || []).filter(c => c !== className)
    });
  };

  const handleAddNewClass = () => {
    if (newClassName.trim() && !availableClasses.includes(newClassName.trim())) {
      setAvailableClasses([...availableClasses, newClassName.trim()]);
    }
    handleAddClass(newClassName.trim());
    setNewClassName('');
  };

  // Custom Field handlers
  const handleOpenFieldDialog = (field?: CustomFieldData, isCopy = false) => {
    if (field) {
      setEditingField(isCopy ? null : field);
      setFieldFormData({
        name: isCopy ? `${field.name} (副本)` : field.name,
        type: field.type,
        description: field.description || ''
      });
    } else {
      setEditingField(null);
      setFieldFormData({
        name: '',
        type: 'text',
        description: ''
      });
    }
    setShowFieldDialog(true);
  };

  const handleSaveField = async () => {
    if (!user || !fieldFormData.name.trim()) {
      toast({
        title: "错误",
        description: "字段名称不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingField) {
        const { error } = await supabase
          .from('custom_fields')
          .update({
            name: fieldFormData.name,
            type: fieldFormData.type,
            description: fieldFormData.description || null
          })
          .eq('id', editingField.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "更新成功",
          description: `字段"${fieldFormData.name}"已更新`,
        });
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert({
            user_id: user.id,
            name: fieldFormData.name,
            type: fieldFormData.type,
            description: fieldFormData.description || null
          });

        if (error) throw error;

        toast({
          title: "创建成功",
          description: `字段"${fieldFormData.name}"已创建`,
        });
      }

      setShowFieldDialog(false);
      loadCustomFields();
    } catch (error: any) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteField = async (fieldId: string, fieldName: string) => {
    if (!confirm(`确定要删除字段"${fieldName}"吗？这将同时删除所有学生的该字段数据。`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "删除成功",
        description: `字段"${fieldName}"已删除`,
      });

      loadCustomFields();
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">标签管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理所有标签和自定义字段
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            新建分类标签
          </Button>
          <Button onClick={() => handleOpenFieldDialog()} className="gap-2" variant="outline">
            <Plus className="w-4 h-4" />
            新建自定义字段
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {tags.length === 0 && customFields.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12">
              <div className="text-center">
                <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">暂无标签</h3>
                <p className="text-sm text-muted-foreground mt-2">点击上方按钮创建您的第一个标签或自定义字段</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {tags.map(tag => (
              <Card key={`tag-${tag.id}`} className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="text-lg font-semibold">{tag.name}</h3>
                        <Badge variant="outline" className="text-xs">分类标签</Badge>
                      </div>
                      {tag.description && (
                        <p className="text-sm text-muted-foreground mb-2">{tag.description}</p>
                      )}
                      {tag.class_mappings && tag.class_mappings.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tag.class_mappings.map(className => (
                            <Badge key={className} variant="secondary" className="text-xs">
                              {className}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(tag)}
                        title="编辑标签"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(tag, true)}
                        title="复制标签"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id!, tag.name)}
                        title="删除标签"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {customFields.map(field => (
              <Card key={`field-${field.id}`} className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <h3 className="text-lg font-semibold">{field.name}</h3>
                        <Badge variant="secondary" className="text-xs">{field.type}</Badge>
                      </div>
                      {field.description && (
                        <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFieldDialog(field)}
                        title="编辑字段"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFieldDialog(field, true)}
                        title="复制字段"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(field.id!, field.name)}
                        title="删除字段"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? '编辑标签' : '新建标签'}
            </DialogTitle>
            <DialogDescription>
              设置标签的名称、颜色和描述信息
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">标签名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：优秀学生、需要关注..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="color">标签颜色</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <span className="text-sm text-muted-foreground">{formData.color}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="description">标签描述（可选）</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述这个标签的用途..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>关联班级（可选）</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  选择此标签适用的班级，便于后续批量管理
                </p>
                
                {/* Display selected classes */}
                {formData.class_mappings && formData.class_mappings.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.class_mappings.map(className => (
                      <Badge 
                        key={className} 
                        variant="secondary" 
                        className="gap-1 pr-1"
                      >
                        {className}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemoveClass(className)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Existing classes selector */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {availableClasses
                      .filter(c => !formData.class_mappings?.includes(c))
                      .map(className => (
                        <Button
                          key={className}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddClass(className)}
                          className="h-8"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {className}
                        </Button>
                      ))}
                  </div>

                  {/* Add new class */}
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="添加新班级..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewClass()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddNewClass}
                      disabled={!newClassName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name.trim()}
            >
              {editingTag ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? '编辑字段' : '新建字段'}
            </DialogTitle>
            <DialogDescription>
              设置自定义字段的名称、类型和描述信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="field-name">字段名称 *</Label>
              <Input
                id="field-name"
                value={fieldFormData.name}
                onChange={(e) => setFieldFormData({ ...fieldFormData, name: e.target.value })}
                placeholder="例如：家长电话、住址..."
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="field-type">字段类型</Label>
              <Select
                value={fieldFormData.type}
                onValueChange={(value) => setFieldFormData({ ...fieldFormData, type: value })}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="选择字段类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文本</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="date">日期</SelectItem>
                  <SelectItem value="email">邮箱</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="field-description">字段描述（可选）</Label>
              <Textarea
                id="field-description"
                value={fieldFormData.description}
                onChange={(e) => setFieldFormData({ ...fieldFormData, description: e.target.value })}
                placeholder="简要描述这个字段的用途..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveField}
              disabled={!fieldFormData.name.trim()}
            >
              {editingField ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleTagManager;
