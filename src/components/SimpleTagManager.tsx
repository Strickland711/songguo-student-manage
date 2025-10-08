import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, Tag, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TagData {
  id?: string;
  name: string;
  color: string;
  description?: string;
  ai_prompt?: string;
  use_for_feedback: boolean;
  created_at?: string;
}

const SimpleTagManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [formData, setFormData] = useState<Omit<TagData, 'id' | 'created_at'>>({
    name: '',
    color: '#3B82F6',
    description: '',
    ai_prompt: '',
    use_for_feedback: false
  });

  useEffect(() => {
    if (user) {
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    if (!user) return;
    
    setLoading(true);
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
        title: "加载失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: TagData) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color,
        description: tag.description || '',
        ai_prompt: tag.ai_prompt || '',
        use_for_feedback: tag.use_for_feedback
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        color: '#3B82F6',
        description: '',
        ai_prompt: '',
        use_for_feedback: false
      });
    }
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

    if (formData.use_for_feedback && !formData.ai_prompt?.trim()) {
      toast({
        title: "错误",
        description: "启用AI反馈时必须设置提示词",
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
            ai_prompt: formData.ai_prompt || null,
            use_for_feedback: formData.use_for_feedback
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
            ai_prompt: formData.ai_prompt || null,
            use_for_feedback: formData.use_for_feedback
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
            创建和管理学生标签，启用AI功能可为每个标签生成个性化反馈
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          新建标签
        </Button>
      </div>

      <div className="grid gap-4">
        {tags.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12">
              <div className="text-center">
                <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">暂无标签</h3>
                <p className="text-sm text-muted-foreground mt-2">点击"新建标签"创建您的第一个标签</p>
              </div>
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
                        style={{ backgroundColor: tag.color }}
                      />
                      <h3 className="text-lg font-semibold">{tag.name}</h3>
                      {tag.use_for_feedback && (
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI反馈
                        </Badge>
                      )}
                    </div>
                    {tag.description && (
                      <p className="text-sm text-muted-foreground mb-3">{tag.description}</p>
                    )}
                    {tag.use_for_feedback && tag.ai_prompt && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">AI提示词：</p>
                        <p className="text-sm italic">{tag.ai_prompt}</p>
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
                      onClick={() => handleDelete(tag.id!, tag.name)}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? '编辑标签' : '新建标签'}
            </DialogTitle>
            <DialogDescription>
              设置标签信息，启用AI功能后可为打上该标签的学生生成个性化反馈
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
                <Label htmlFor="description">标签描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述这个标签的用途..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">启用AI反馈生成</Label>
                  <p className="text-sm text-muted-foreground">
                    使用AI为拥有此标签的学生生成个性化反馈话术
                  </p>
                </div>
                <Switch 
                  checked={formData.use_for_feedback} 
                  onCheckedChange={(checked) => setFormData({ ...formData, use_for_feedback: checked })}
                />
              </div>

              {formData.use_for_feedback && (
                <div>
                  <Label htmlFor="ai_prompt" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI提示词 *
                  </Label>
                  <Textarea
                    id="ai_prompt"
                    value={formData.ai_prompt}
                    onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                    placeholder="输入AI生成提示词，例如：这是一位学习非常认真的学生，请重点表扬他的学习态度和课堂表现..."
                    rows={6}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    AI将根据此提示词和学生的具体信息（姓名、班级等）生成个性化反馈
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name.trim() || (formData.use_for_feedback && !formData.ai_prompt?.trim())}
            >
              {editingTag ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleTagManager;
