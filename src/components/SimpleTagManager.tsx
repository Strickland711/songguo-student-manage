import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, X, Edit2, Check, Sparkles, Tag as TagIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Tag {
  id?: string;
  name: string;
  color: string;
  description?: string;
  ai_prompt?: string;
  use_for_feedback?: boolean;
}

const SimpleTagManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagAiPrompt, setNewTagAiPrompt] = useState('');
  const [useForFeedback, setUseForFeedback] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useEffect(() => {
    if (user) {
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Failed to load tags:', error);
      toast({
        title: "加载失败",
        description: "无法加载标签",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "错误",
        description: "请输入标签名称",
        variant: "destructive",
      });
      return;
    }

    if (useForFeedback && !newTagAiPrompt.trim()) {
      toast({
        title: "错误",
        description: "启用AI反馈时必须填写AI提示词",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            name: newTagName,
            color: newTagColor,
            description: newTagDescription,
            ai_prompt: newTagAiPrompt || null,
            use_for_feedback: useForFeedback,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "创建成功",
        description: `标签 "${newTagName}" 已创建`,
      });

      setNewTagName('');
      setNewTagColor('#3B82F6');
      setNewTagDescription('');
      setNewTagAiPrompt('');
      setUseForFeedback(false);
      loadTags();
    } catch (error: any) {
      console.error('Failed to create tag:', error);
      toast({
        title: "创建失败",
        description: "创建标签时发生错误",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    if (!editingTag.name.trim()) {
      toast({
        title: "错误",
        description: "请输入标签名称",
        variant: "destructive",
      });
      return;
    }

    if (editingTag.use_for_feedback && !editingTag.ai_prompt?.trim()) {
      toast({
        title: "错误",
        description: "启用AI反馈时必须填写AI提示词",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .update({
          name: editingTag.name,
          color: editingTag.color,
          description: editingTag.description,
          ai_prompt: editingTag.ai_prompt || null,
          use_for_feedback: editingTag.use_for_feedback || false,
        })
        .eq('id', editingTag.id);

      if (error) throw error;

      toast({
        title: "更新成功",
        description: "标签已更新",
      });

      setEditingTag(null);
      loadTags();
    } catch (error: any) {
      console.error('Failed to update tag:', error);
      toast({
        title: "更新失败",
        description: "更新标签时发生错误",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async () => {
    if (!editingTag?.id) return;

    if (!confirm('确定要删除这个标签吗？这将同时删除学生与该标签的关联。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', editingTag.id);

      if (error) throw error;

      toast({
        title: "删除成功",
        description: "标签已删除",
      });

      setEditingTag(null);
      loadTags();
    } catch (error: any) {
      console.error('Failed to delete tag:', error);
      toast({
        title: "删除失败",
        description: "删除标签时发生错误",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-primary" />
            标签管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Input
              placeholder="标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>标签颜色</Label>
                <Input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-10 mt-1"
                />
              </div>
            </div>
            <Input
              placeholder="标签描述（可选）"
              value={newTagDescription}
              onChange={(e) => setNewTagDescription(e.target.value)}
            />
            
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  用于AI反馈生成
                </Label>
                <p className="text-sm text-muted-foreground">
                  启用后可为此标签设置AI提示词
                </p>
              </div>
              <Switch checked={useForFeedback} onCheckedChange={setUseForFeedback} />
            </div>

            {useForFeedback && (
              <div className="space-y-2">
                <Label>AI提示词</Label>
                <Textarea
                  placeholder="例如：请根据学生的课堂表现，重点关注学习态度和参与度，给出鼓励性的反馈..."
                  value={newTagAiPrompt}
                  onChange={(e) => setNewTagAiPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  AI将根据此提示词和学生信息生成个性化反馈
                </p>
              </div>
            )}
            
            <Button onClick={handleAddTag} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              添加标签
            </Button>
          </div>

          {/* 现有标签列表 */}
          {tags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">现有标签</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white cursor-pointer hover:opacity-80 flex items-center gap-2 px-3 py-2"
                    onClick={() => setEditingTag(tag)}
                  >
                    {tag.use_for_feedback && <Sparkles className="w-3 h-3" />}
                    {tag.name}
                    {tag.description && (
                      <span className="text-xs opacity-75">- {tag.description}</span>
                    )}
                    <Edit2 className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 编辑对话框 */}
          {editingTag && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>编辑标签</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="标签名称"
                    value={editingTag.name}
                    onChange={(e) =>
                      setEditingTag({ ...editingTag, name: e.target.value })
                    }
                  />
                  <div>
                    <Label>标签颜色</Label>
                    <Input
                      type="color"
                      value={editingTag.color}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, color: e.target.value })
                      }
                      className="h-10 mt-1"
                    />
                  </div>
                  <Input
                    placeholder="标签描述（可选）"
                    value={editingTag.description || ''}
                    onChange={(e) =>
                      setEditingTag({ ...editingTag, description: e.target.value })
                    }
                  />
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        用于AI反馈生成
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        启用后可为此标签设置AI提示词
                      </p>
                    </div>
                    <Switch 
                      checked={editingTag.use_for_feedback || false} 
                      onCheckedChange={(checked) => 
                        setEditingTag({ ...editingTag, use_for_feedback: checked })
                      } 
                    />
                  </div>

                  {editingTag.use_for_feedback && (
                    <div className="space-y-2">
                      <Label>AI提示词</Label>
                      <Textarea
                        placeholder="例如：请根据学生的课堂表现，重点关注学习态度和参与度，给出鼓励性的反馈..."
                        value={editingTag.ai_prompt || ''}
                        onChange={(e) =>
                          setEditingTag({ ...editingTag, ai_prompt: e.target.value })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        AI将根据此提示词和学生信息生成个性化反馈
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateTag} size="sm" className="flex-1">
                      <Check className="w-4 h-4 mr-1" />
                      保存
                    </Button>
                    <Button
                      onClick={handleDeleteTag}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                    <Button
                      onClick={() => setEditingTag(null)}
                      variant="outline"
                      size="sm"
                    >
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleTagManager;
