import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Tag, Edit, Trash2, Plus, Merge, Upload, FileText, AlertTriangle } from 'lucide-react';
import { useTagsData, TagWithStudentCount } from '@/hooks/useTagsData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TagsManagement = () => {
  const { tags, loading, createTag, updateTag, deleteTag, mergeTags } = useTagsData();
  const { toast } = useToast();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  
  const [selectedTag, setSelectedTag] = useState<TagWithStudentCount | null>(null);
  const [mergeSourceTag, setMergeSourceTag] = useState<string>('');
  const [mergeTargetTag, setMergeTargetTag] = useState<string>('');
  const [conflictTags, setConflictTags] = useState<{ existing: TagWithStudentCount, imported: any }[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    description: ''
  });

  const predefinedColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6B7280'  // Gray
  ];

  const resetForm = () => {
    setFormData({ name: '', color: '#3B82F6', description: '' });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "请输入标签名称",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTag(formData);
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (tag: TagWithStudentCount) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTag || !formData.name.trim()) return;

    try {
      await updateTag(selectedTag.id!, formData);
      setEditDialogOpen(false);
      resetForm();
      setSelectedTag(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = (tag: TagWithStudentCount) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTag) return;

    try {
      await deleteTag(selectedTag.id!);
      setDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceTag || !mergeTargetTag) {
      toast({
        title: "请选择要合并的标签",
        variant: "destructive",
      });
      return;
    }

    if (mergeSourceTag === mergeTargetTag) {
      toast({
        title: "不能将标签与自己合并",
        variant: "destructive",
      });
      return;
    }

    try {
      await mergeTags(mergeSourceTag, mergeTargetTag, true);
      setMergeDialogOpen(false);
      setMergeSourceTag('');
      setMergeTargetTag('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedTags: any[] = [];

        if (file.name.endsWith('.json')) {
          importedTags = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Simple CSV parsing
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          importedTags = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });
        }

        processImportedTags(importedTags);
      } catch (error) {
        toast({
          title: "文件格式错误",
          description: "请确保文件格式正确",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const processImportedTags = (importedTags: any[]) => {
    const conflicts: { existing: TagWithStudentCount, imported: any }[] = [];
    const newTags: any[] = [];

    importedTags.forEach(importedTag => {
      const existingTag = tags.find(tag => 
        tag.name.toLowerCase() === importedTag.name?.toLowerCase()
      );
      
      if (existingTag) {
        conflicts.push({ existing: existingTag, imported: importedTag });
      } else {
        newTags.push({
          name: importedTag.name || '',
          color: importedTag.color || '#3B82F6',
          description: importedTag.description || ''
        });
      }
    });

    // Create new tags immediately
    newTags.forEach(async (tag) => {
      if (tag.name.trim()) {
        try {
          await createTag(tag);
        } catch (error) {
          console.error('Failed to create imported tag:', error);
        }
      }
    });

    // Handle conflicts
    if (conflicts.length > 0) {
      setConflictTags(conflicts);
      setConflictDialogOpen(true);
    } else {
      toast({
        title: "导入成功",
        description: `成功导入 ${newTags.length} 个标签`,
      });
    }

    setUploadDialogOpen(false);
  };

  const resolveConflict = async (conflict: { existing: TagWithStudentCount, imported: any }, useImported: boolean) => {
    if (useImported) {
      try {
        await updateTag(conflict.existing.id!, {
          name: conflict.imported.name || conflict.existing.name,
          color: conflict.imported.color || conflict.existing.color,
          description: conflict.imported.description || conflict.existing.description
        });
      } catch (error) {
        console.error('Failed to update tag with imported data:', error);
      }
    }
    // If using existing, do nothing
  };

  const resolveAllConflicts = async (useImported: boolean) => {
    for (const conflict of conflictTags) {
      await resolveConflict(conflict, useImported);
    }
    
    toast({
      title: "冲突已解决",
      description: `已${useImported ? '使用导入的' : '保留现有的'}数据`,
    });
    
    setConflictDialogOpen(false);
    setConflictTags([]);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">标签管理</h2>
          <p className="text-muted-foreground mt-1">管理学生标签，支持批量导入和标签合并</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setUploadDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入标签
          </Button>
          <Button
            onClick={() => setMergeDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={tags.length < 2}
          >
            <Merge className="w-4 h-4" />
            合并标签
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建标签
          </Button>
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tags.map(tag => (
          <Card key={tag.id} className="shadow-card hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <CardTitle className="text-sm font-medium truncate">
                    {tag.name}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tag.student_count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tag.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tag.description}
                  </p>
                )}
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(tag)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(tag)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {tags.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有标签</h3>
            <p className="text-muted-foreground mb-4">创建第一个标签来开始组织学生信息</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建标签
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
          setSelectedTag(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialogOpen ? '编辑标签' : '创建标签'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">标签名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label>标签颜色</Label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color 
                        ? "border-primary scale-110" 
                        : "border-border hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-8"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入标签描述"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
              setSelectedTag(null);
            }}>
              取消
            </Button>
            <Button onClick={editDialogOpen ? handleUpdate : handleCreate}>
              {editDialogOpen ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入标签</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择文件</Label>
              <Input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                支持 JSON 和 CSV 格式文件。相同名称的标签将会自动合并。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>文件格式示例</Label>
              <div className="text-xs bg-muted p-3 rounded-md space-y-2">
                <div>
                  <strong>JSON 格式:</strong>
                  <pre className="mt-1">{`[
  {
    "name": "优秀学生",
    "color": "#10B981",
    "description": "表现优异的学生"
  }
]`}</pre>
                </div>
                <div>
                  <strong>CSV 格式:</strong>
                  <pre className="mt-1">{`name,color,description
优秀学生,#10B981,表现优异的学生`}</pre>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>合并标签</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>源标签（将被删除）</Label>
              <Select value={mergeSourceTag} onValueChange={setMergeSourceTag}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要合并的标签" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id!}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name} ({tag.student_count} 学生)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>目标标签（将保留）</Label>
              <Select value={mergeTargetTag} onValueChange={setMergeTargetTag}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标标签" />
                </SelectTrigger>
                <SelectContent>
                  {tags.filter(tag => tag.id !== mergeSourceTag).map(tag => (
                    <SelectItem key={tag.id} value={tag.id!}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name} ({tag.student_count} 学生)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">合并说明</p>
                  <p className="text-amber-700 mt-1">
                    源标签的所有学生将转移到目标标签，源标签将被删除。目标标签的信息将被保留。
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleMerge} disabled={!mergeSourceTag || !mergeTargetTag}>
              合并标签
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>标签名称冲突</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              发现 {conflictTags.length} 个标签名称与现有标签冲突，请选择如何处理：
            </p>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {conflictTags.map((conflict, index) => (
                <div key={index} className="border rounded-md p-3 space-y-2">
                  <div className="font-medium">冲突标签: {conflict.existing.name}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-600">现有标签</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: conflict.existing.color }}
                        />
                        <span>{conflict.existing.color}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {conflict.existing.description || '无描述'}
                      </div>
                      <div className="text-muted-foreground">
                        {conflict.existing.student_count} 个学生
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-600">导入标签</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: conflict.imported.color || '#3B82F6' }}
                        />
                        <span>{conflict.imported.color || '#3B82F6'}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {conflict.imported.description || '无描述'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
              取消
            </Button>
            <Button variant="outline" onClick={() => resolveAllConflicts(false)}>
              保留现有数据
            </Button>
            <Button onClick={() => resolveAllConflicts(true)}>
              使用导入数据
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 "{selectedTag?.name}" 吗？
              {selectedTag && selectedTag.student_count > 0 && (
                <>
                  <br />
                  <span className="text-red-600 font-medium">
                    此操作将同时移除 {selectedTag.student_count} 个学生的此标签。
                  </span>
                </>
              )}
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagsManagement;