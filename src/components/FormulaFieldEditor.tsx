import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Calculator, Trash2 } from "lucide-react";
import { validateFormula, extractDependencies, evaluateFormula } from "@/utils/formulaCalculator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// 自定义字段接口
interface CustomField {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  formula?: string | null;
  formula_dependencies?: string[] | null;
  created_at?: string;
  user_id?: string;
}

// 学生接口
interface Student {
  id?: string;
  name: string;
  class: string;
  [key: string]: any;
}

// 公式字段编辑器组件
export const FormulaFieldEditor = ({ students }: { students: Student[] }) => {
  const { toast } = useToast();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [formulaName, setFormulaName] = useState("");
  const [formulaDescription, setFormulaDescription] = useState("");
  const [formulaExpression, setFormulaExpression] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);

  // 加载所有自定义字段
  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 转换数据类型
      const typedFields: CustomField[] = (data || []).map(field => ({
        ...field,
        formula_dependencies: Array.isArray(field.formula_dependencies) 
          ? field.formula_dependencies as string[]
          : null
      }));
      
      setFields(typedFields);
    } catch (error) {
      console.error('加载字段失败:', error);
      toast({
        title: "加载失败",
        description: "无法加载自定义字段",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取可用于公式的数字字段（非公式字段）
  const numericFields = fields.filter(f => f.type === 'number' && !f.formula);

  // 获取已创建的公式字段
  const formulaFields = fields.filter(f => f.formula);

  // 插入字段ID到公式
  const insertFieldId = (fieldId: string, fieldName: string) => {
    setFormulaExpression(prev => prev + (prev ? ' ' : '') + fieldId);
    toast({
      title: "已添加字段",
      description: `字段 "${fieldName}" 已添加到公式中`,
    });
  };

  // 验证并保存公式字段
  const handleSaveFormula = async () => {
    if (!formulaName.trim()) {
      toast({
        title: "名称不能为空",
        description: "请输入公式字段的名称",
        variant: "destructive",
      });
      return;
    }

    if (!formulaExpression.trim()) {
      toast({
        title: "公式不能为空",
        description: "请输入公式表达式",
        variant: "destructive",
      });
      return;
    }

    // 验证公式
    const fieldIds = numericFields.map(f => f.id);
    const validation = validateFormula(formulaExpression, fieldIds);
    
    if (!validation.valid) {
      toast({
        title: "公式无效",
        description: validation.error || "公式格式错误",
        variant: "destructive",
      });
      return;
    }

    // 提取依赖字段
    const dependencies = extractDependencies(formulaExpression, fieldIds);

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      const { error } = await supabase
        .from('custom_fields')
        .insert({
          user_id: user.id,
          name: formulaName,
          type: 'formula',
          description: formulaDescription || null,
          formula: formulaExpression,
          formula_dependencies: dependencies,
        });

      if (error) throw error;

      toast({
        title: "公式字段已创建",
        description: `"${formulaName}" 创建成功`,
      });

      // 重置表单
      setFormulaName("");
      setFormulaDescription("");
      setFormulaExpression("");
      
      // 重新加载字段列表
      loadFields();
    } catch (error) {
      console.error('保存公式字段失败:', error);
      toast({
        title: "保存失败",
        description: "无法保存公式字段",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 为选定学生计算公式值
  const handleCalculateForStudents = async (field: CustomField) => {
    if (!field.formula || !field.formula_dependencies) return;

    setCalculating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');

      const studentsToCalculate = selectedStudentIds.length > 0 
        ? students.filter(s => selectedStudentIds.includes(s.id))
        : students;

      if (studentsToCalculate.length === 0) {
        toast({
          title: "请选择学生",
          description: "请至少选择一个学生进行计算",
          variant: "destructive",
        });
        return;
      }

      // 获取依赖字段的值
      const { data: fieldValues, error: fetchError } = await supabase
        .from('student_field_values')
        .select('student_id, field_id, value')
        .in('student_id', studentsToCalculate.map(s => s.id))
        .in('field_id', field.formula_dependencies);

      if (fetchError) throw fetchError;

      const valuesToInsert = [];
      let successCount = 0;
      let errorCount = 0;

      for (const student of studentsToCalculate) {
        // 构建字段值映射
        const fieldValueMap: Record<string, number> = {};
        
        field.formula_dependencies.forEach(depFieldId => {
          const value = fieldValues?.find(
            fv => fv.student_id === student.id && fv.field_id === depFieldId
          )?.value;
          
          if (value) {
            fieldValueMap[depFieldId] = parseFloat(value);
          }
        });

        // 计算公式结果
        const result = evaluateFormula(field.formula, fieldValueMap);
        
        if (result !== null) {
          valuesToInsert.push({
            student_id: student.id,
            field_id: field.id,
            value: result.toString(),
          });
          successCount++;
        } else {
          errorCount++;
        }
      }

      // 批量插入或更新值
      if (valuesToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('student_field_values')
          .upsert(valuesToInsert, {
            onConflict: 'student_id,field_id',
          });

        if (upsertError) throw upsertError;
      }

      toast({
        title: "计算完成",
        description: `成功: ${successCount}, 失败: ${errorCount}`,
      });

      // 清空选择
      setSelectedStudentIds([]);
    } catch (error) {
      console.error('计算公式失败:', error);
      toast({
        title: "计算失败",
        description: "无法计算公式值",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  // 删除公式字段
  const handleDeleteField = async () => {
    if (!fieldToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldToDelete.id);

      if (error) throw error;

      toast({
        title: "已删除",
        description: `公式字段 "${fieldToDelete.name}" 已删除`,
      });

      loadFields();
    } catch (error) {
      console.error('删除字段失败:', error);
      toast({
        title: "删除失败",
        description: "无法删除公式字段",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setFieldToDelete(null);
    }
  };

  if (loading && fields.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 创建公式字段 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            创建公式字段
          </CardTitle>
          <CardDescription>
            基于现有数字字段创建计算字段，支持加减乘除运算
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formula-name">字段名称</Label>
            <Input
              id="formula-name"
              placeholder="例如：总分"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="formula-desc">描述（可选）</Label>
            <Input
              id="formula-desc"
              placeholder="字段说明"
              value={formulaDescription}
              onChange={(e) => setFormulaDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>可用字段</Label>
            <div className="flex flex-wrap gap-2">
              {numericFields.map(field => (
                <Badge
                  key={field.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => insertFieldId(field.id, field.name)}
                >
                  {field.name}
                </Badge>
              ))}
              {numericFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  暂无可用的数字字段，请先创建数字类型的自定义字段
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              点击字段名称添加到公式中，支持运算符: + - * / ( )
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formula-expr">公式表达式</Label>
            <Textarea
              id="formula-expr"
              placeholder="例如: field_id_1 + field_id_2 * 0.5"
              value={formulaExpression}
              onChange={(e) => setFormulaExpression(e.target.value)}
              className="font-mono"
            />
          </div>

          <Button onClick={handleSaveFormula} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                创建公式字段
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 已创建的公式字段列表 */}
      {formulaFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>已创建的公式字段</CardTitle>
            <CardDescription>
              选择学生并计算公式字段的值
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 学生选择 */}
            <div className="space-y-2">
              <Label>选择学生（不选择则为所有学生计算）</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-4 space-y-2">
                {students.map(student => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudentIds([...selectedStudentIds, student.id]);
                        } else {
                          setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`student-${student.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {student.name} ({student.class})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 公式字段列表 */}
            <div className="space-y-3">
              {formulaFields.map(field => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{field.name}</h4>
                          {field.description && (
                            <p className="text-sm text-muted-foreground">
                              {field.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFieldToDelete(field);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">公式:</p>
                        <code className="text-sm">{field.formula}</code>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleCalculateForStudents(field)}
                        disabled={calculating}
                      >
                        {calculating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            计算中...
                          </>
                        ) : (
                          <>
                            <Calculator className="mr-2 h-4 w-4" />
                            计算选定学生的值
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除公式字段 "{fieldToDelete?.name}" 吗？
              此操作将同时删除所有学生该字段的值，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
