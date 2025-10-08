import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, FileText, Tag, Sparkles } from 'lucide-react';
import { useFeedbackTemplates, FeedbackTemplate } from '@/hooks/useFeedbackTemplates';
import { CustomField, Student } from '@/hooks/useStudentData';
import { cn } from '@/lib/utils';

interface FeedbackTemplateManagerProps {
  customFields: CustomField[];
  students: Student[];
}

const FeedbackTemplateManager = ({ customFields, students }: FeedbackTemplateManagerProps) => {
  const { templates, loading, saveTemplate, deleteTemplate } = useFeedbackTemplates();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeedbackTemplate | null>(null);
  const [selectedField, setSelectedField] = useState<string>('class');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [useAI, setUseAI] = useState(false);

  // 获取所有可用的分类字段
  const availableFields = useMemo(() => {
    return [
      { name: 'class', label: '班级' },
      ...customFields.map(f => ({ name: f.name, label: f.name }))
    ];
  }, [customFields]);

  // 获取选中字段的所有可能值
  const availableValues = useMemo(() => {
    if (!selectedField) return [];
    
    const values = new Set<string>();
    students.forEach(student => {
      const value = student[selectedField];
      if (value) values.add(String(value));
    });
    
    return Array.from(values).sort();
  }, [selectedField, students]);

  // 按字段分组模板
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, FeedbackTemplate[]> = {};
    templates.forEach(template => {
      if (!groups[template.tag_field_name]) {
        groups[template.tag_field_name] = [];
      }
      groups[template.tag_field_name].push(template);
    });
    return groups;
  }, [templates]);

  const handleOpenDialog = (template?: FeedbackTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setSelectedField(template.tag_field_name);
      setSelectedValue(template.tag_value);
      setTemplateName(template.name);
      setTemplateContent(template.template);
      setAiPrompt(template.ai_prompt || '');
      setUseAI(template.use_ai || false);
    } else {
      setEditingTemplate(null);
      setSelectedField('class');
      setSelectedValue('');
      setTemplateName('');
      setTemplateContent('');
      setAiPrompt('');
      setUseAI(false);
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedField || !selectedValue || !templateName) {
      return;
    }

    if (useAI && !aiPrompt) {
      return;
    }

    if (!useAI && !templateContent) {
      return;
    }

    try {
      await saveTemplate({
        name: templateName,
        tag_field_name: selectedField,
        tag_value: selectedValue,
        template: templateContent,
        ai_prompt: aiPrompt,
        use_ai: useAI
      });
      setShowDialog(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (templateId: string) => {
    if (confirm('确定要删除这个话术模板吗？')) {
      try {
        await deleteTemplate(templateId);
      } catch (error) {
        // Error handled in hook
      }
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = templateContent;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + `{${variable}}` + after;
    setTemplateContent(newText);
    
    // 延迟设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
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
          <h2 className="text-2xl font-bold text-primary">反馈话术模板</h2>
          <p className="text-sm text-muted-foreground mt-1">
            为不同分类的学生设置个性化的反馈话术模板
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          新建模板
        </Button>
      </div>

      <div className="grid gap-6">
        {availableFields.map(field => {
          const fieldTemplates = groupedTemplates[field.name] || [];
          
          return (
            <Card key={field.name} className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-accent" />
                  {field.label}分类话术
                </CardTitle>
                <CardDescription>
                  共 {fieldTemplates.length} 个模板
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fieldTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>暂无话术模板</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {fieldTemplates.map(template => (
                      <div
                        key={template.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                      >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="secondary">{template.tag_value}</Badge>
                              {template.use_ai && (
                                <Badge variant="outline" className="gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  AI
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.use_ai ? (
                                <span className="italic">提示词：{template.ai_prompt}</span>
                              ) : (
                                template.template
                              )}
                            </p>
                          </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '编辑话术模板' : '新建话术模板'}
            </DialogTitle>
            <DialogDescription>
              设置模板的分类标签和话术内容，可以插入变量如 {'{姓名}'} {'{班级}'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div>
                <Label>模板名称</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例如：优秀学生反馈模板"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>分类字段</Label>
                <Select value={selectedField} onValueChange={(value) => {
                  setSelectedField(value);
                  setSelectedValue('');
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="选择分类字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>分类值</Label>
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="选择分类值" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableValues.map(value => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">AI智能生成</Label>
                  <p className="text-sm text-muted-foreground">
                    使用AI为每位学生生成个性化反馈
                  </p>
                </div>
                <Switch checked={useAI} onCheckedChange={setUseAI} />
              </div>

              {useAI ? (
                <div>
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI提示词
                  </Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="输入AI生成提示词，例如：请根据学生的表现，重点关注学习态度和课堂参与度，给出鼓励性的反馈..."
                    rows={6}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    AI将根据此提示词和学生的具体信息（姓名、班级及自定义字段）生成个性化反馈
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>话术内容</Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        插入变量：
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable('姓名')}
                        >
                          {'{姓名}'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable('班级')}
                        >
                          {'{班级}'}
                        </Button>
                        {customFields.map(field => (
                          <Button
                            key={field.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariable(field.name)}
                          >
                            {`{${field.name}}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      id="template-content"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="输入话术内容，可以使用变量如 {姓名}、{班级} 等..."
                      rows={8}
                      className="mt-2"
                    />
                  </div>

                  {templateContent && (
                    <div className="p-3 bg-muted rounded-lg">
                      <Label className="text-xs text-muted-foreground">预览效果（示例）</Label>
                      <p className="text-sm mt-2 whitespace-pre-wrap">
                        {templateContent
                          .replace(/\{姓名\}/g, '张三')
                          .replace(/\{班级\}/g, '一年级1班')
                        }
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !selectedField || 
                !selectedValue || 
                !templateName || 
                (useAI ? !aiPrompt : !templateContent)
              }
            >
              保存模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackTemplateManager;
