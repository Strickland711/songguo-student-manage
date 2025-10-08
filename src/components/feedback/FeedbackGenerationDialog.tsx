import { Sparkles, Loader2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

/**
 * AI反馈话术生成对话框组件
 * 允许用户选择AI参考的信息来源并生成个性化话术
 */
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FeedbackGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentTags?: Tag[];
  selectedTagIds: string[];
  includeExams: boolean;
  customPrompt: string;
  generatedScript: string;
  isGenerating: boolean;
  onSelectedTagsChange: (tagIds: string[]) => void;
  onIncludeExamsChange: (include: boolean) => void;
  onCustomPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
}

export const FeedbackGenerationDialog = ({
  open,
  onOpenChange,
  studentName,
  studentTags = [],
  selectedTagIds,
  includeExams,
  customPrompt,
  generatedScript,
  isGenerating,
  onSelectedTagsChange,
  onIncludeExamsChange,
  onCustomPromptChange,
  onGenerate,
  onCopy
}: FeedbackGenerationDialogProps) => {
  /**
   * 切换标签选中状态
   */
  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectedTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelectedTagsChange([...selectedTagIds, tagId]);
    }
  };

  // 判断是否禁用生成按钮
  const isGenerateDisabled = isGenerating || (selectedTagIds.length === 0 && !includeExams && !customPrompt.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            为 {studentName} 生成反馈话术
          </DialogTitle>
          <DialogDescription>
            选择AI要参考的信息来源，生成个性化的家长沟通话术
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* AI参考信息选择区域 */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">AI参考信息</Label>
              
              {/* 学生标签选择 - 点击切换选中状态 */}
              {studentTags.length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <Label className="text-sm font-medium">学生标签（可多选）</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {studentTags.map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer transition-all"
                          style={isSelected ? { 
                            backgroundColor: tag.color,
                            borderColor: tag.color,
                            color: 'white'
                          } : {
                            borderColor: tag.color,
                            color: tag.color
                          }}
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 考试成绩选择 */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox 
                  id="include-exams" 
                  checked={includeExams}
                  onCheckedChange={(checked) => onIncludeExamsChange(checked as boolean)}
                />
                <label
                  htmlFor="include-exams"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  考试成绩记录
                  <span className="text-muted-foreground ml-2">（近5次考试）</span>
                </label>
              </div>
            </div>

            {/* 自定义提示输入框 */}
            <div>
              <Label htmlFor="custom-prompt">自定义提示（可选）</Label>
              <Textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                placeholder="添加额外的提示信息，例如：重点关注学生的课堂参与度、需要鼓励学生多发言..."
                rows={4}
                className="mt-2"
              />
            </div>

            {/* 生成的话术显示区域 */}
            {generatedScript && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">生成的话术</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCopy}
                    className="gap-2"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </Button>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">{generatedScript}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button 
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成话术
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
