import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Tag as TagIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tag {
  id?: string;
  name: string;
  color?: string;
  description?: string;
  ai_prompt?: string;
  use_for_feedback?: boolean;
}

const colorOptions = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '绿色', value: '#10B981' },
  { name: '黄色', value: '#F59E0B' },
  { name: '红色', value: '#EF4444' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '粉色', value: '#EC4899' },
  { name: '青色', value: '#06B6D4' },
  { name: '橙色', value: '#F97316' },
];

const SimpleTagManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');
  const [tagDescription, setTagDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [useForFeedback, setUseForFeedback] = useState(false);

  useEffect(() => {
    if (user) {
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Error loading tags:', error);
      toast({
        title: "加载失败",
        description: "无法加载标签列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color || '#3B82F6');
      setTagDescription(tag.description || '');
      setAiPrompt(tag.ai_prompt || '');
      setUseForFeedback(tag.use_for_feedback || false);
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#3B82F6');
      setTagDescription('');
      setAiPrompt('');
      setUseForFeedback(false);
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!tagName.trim()) {
      toast({
        title: "错误",
        description: "请输入标签名称",
        variant: "destructive",
      });
      return;
    }

    if (useForFeedback && !aiPrompt.trim()) {
      toast({
        title: "错误",
        description: "启用AI反馈生成时必须填写AI提示词",
        variant: "destructive",
      });
      return;
    }

    try {
      const tagData = {
        name: tagName,
        color: tagColor,
        description: tagDescription || null,
        ai_prompt: useForFeedback ? aiPrompt : null,
        use_for_feedback: useForFeedback,
        user_id: user!.id,
      };

      if (editingTag?.id) {
        const { error } = await supabase
          .from('tags')
          .update(tagData)
          .eq('id', editingTag.id)
          .eq('user_id', user!.id);

        if (error) throw error;
        
        toast({
          title: "更新成功",
          description: "标签已更新",
        });
      } else {
        const { error } = await supabase
          .from('tags')
          .insert([tagData]);

        if (error) throw error;
        
        toast({
          title: "创建成功",
          description: "标签已创建",
        });
      }

      setShowDialog(false);
      loadTags();
    } catch (error: any) {
      console.error('Error saving tag:', error);
      toast({
        title: "保存失败",
        description: error.message || "保存标签失败",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？')) {
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
        description: "标签已删除",
      });
      
      loadTags();
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast({
        title: "删除失败",
        description: error.message || "删除标签失败",
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
            创建标签并设置AI反馈提示词
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          新建标签
        </Button>
      </div>

      <div className="grid gap-4">
        {tags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TagIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无标签</p>
              <p className="text-sm text-muted-foreground">点击上方按钮创建第一个标签</p>
            </CardContent>
          </Card>
        ) : (
          tags.map(tag => (
            <Card key={tag.id} className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                      />
                      <h3 className="font-semibold text-lg">{tag.name}</h3>
                      {tag.use_for_feedback && (
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI反馈
                        </Badge>
                      )}
                    </div>
                    {tag.description && (
                      <p className="text-sm text-muted-foreground mb-2">{tag.description}</p>
                    )}
                    {tag.use_for_feedback && tag.ai_prompt && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">AI提示词：</p>
                        <p className="text-sm">{tag.ai_prompt}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(tag)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? '编辑标签' : '新建标签'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>标签名称</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="例如：优秀学生、需要关注..."
                className="mt-2"
              />
            </div>

            <div>
              <Label>标签颜色</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTagColor(option.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      tagColor === option.value && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: option.value }}
                    title={option.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>标签描述（可选）</Label>
              <Textarea
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                placeholder="简单描述这个标签的用途..."
                rows={2}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">用于AI反馈生成</Label>
                <p className="text-sm text-muted-foreground">
                  启用后可以为拥有此标签的学生生成个性化反馈
                </p>
              </div>
              <Switch 
                checked={useForFeedback} 
                onCheckedChange={setUseForFeedback} 
              />
            </div>

            {useForFeedback && (
              <div>
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI提示词
                </Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="输入AI生成提示词，例如：这位学生学习态度认真，请给出鼓励性的反馈..."
                  rows={6}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  AI将根据此提示词和学生的具体信息生成个性化反馈
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存标签
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleTagManager;
