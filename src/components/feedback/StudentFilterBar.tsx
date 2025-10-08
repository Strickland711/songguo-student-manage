import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

/**
 * 学生筛选栏组件
 * 用于按班级和姓名筛选学生
 */
interface StudentFilterBarProps {
  filterClass: string;
  searchName: string;
  allClasses: string[];
  onFilterClassChange: (value: string) => void;
  onSearchNameChange: (value: string) => void;
}

export const StudentFilterBar = ({
  filterClass,
  searchName,
  allClasses,
  onFilterClassChange,
  onSearchNameChange
}: StudentFilterBarProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-accent" />
          筛选学生
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* 班级筛选下拉框 */}
          <Select value={filterClass} onValueChange={onFilterClassChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部班级</SelectItem>
              {allClasses.map(className => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 姓名搜索输入框 */}
          <Input
            placeholder="搜索学生姓名..."
            value={searchName}
            onChange={(e) => onSearchNameChange(e.target.value)}
            className="w-48"
          />
        </div>
      </CardContent>
    </Card>
  );
};
