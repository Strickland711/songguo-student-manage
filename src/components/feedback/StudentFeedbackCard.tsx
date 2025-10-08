import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * 学生反馈卡片组件
 * 显示学生基本信息和标签，提供生成AI话术的入口
 */
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface StudentFeedbackCardProps {
  student: {
    id?: string;
    name: string;
    class: string;
    tags?: Tag[];
  };
  onGenerateClick: () => void;
}

export const StudentFeedbackCard = ({ student, onGenerateClick }: StudentFeedbackCardProps) => {
  return (
    <Card className="shadow-card hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {/* 学生信息区域 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{student.name}</h3>
              <Badge variant="secondary">{student.class}</Badge>
            </div>
            
            {/* 显示学生的标签 */}
            {student.tags && student.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {student.tags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* 生成话术按钮 */}
          <Button onClick={onGenerateClick} className="gap-2">
            <Sparkles className="w-4 h-4" />
            生成话术
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
