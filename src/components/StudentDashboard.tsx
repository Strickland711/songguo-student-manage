import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Users, FileSpreadsheet, Settings, Plus, Edit, Trash2, ArrowRight, X, BookOpen, UserPlus, MessageSquare, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import ScoringSystem from './ScoringSystem';
import ClassSpace from './ClassSpace';
import TagDragSystem from './TagDragSystem';
import StudentSpace from './StudentSpace';
import TagGenerator from './TagGenerator';
import { FormulaFieldEditor } from './FormulaFieldEditor';

import { useStudentData, Student, CustomField } from '@/hooks/useStudentData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';

interface ColumnMapping {
  column: string;
  field: string;
}

interface ExcelData {
  columns: string[];
  rows: any[];
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const {
    students,
    customFields,
    loading: dataLoading,
    setStudents,
    setCustomFields,
    saveStudents,
    saveCustomFields,
    deleteStudent: deleteStudentFromDB,
    deleteCustomField: deleteCustomFieldFromDB,
    saveScoringRecord,
    loadData,
    updateStudentClass,
    updateClassNameForAllStudents
  } = useStudentData();
  const [uploading, setUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'email'>('text');
  
  // 新增状态用于列映射
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [selectedAsCustomFields, setSelectedAsCustomFields] = useState<string[]>([]);
  
  // 重复学生处理状态
  const [duplicateStudents, setDuplicateStudents] = useState<Student[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  
  // 学生显示和筛选状态
  const [visibleFields, setVisibleFields] = useState<string[]>(['name', 'class']);
  const [filterValue, setFilterValue] = useState('');
  const [filterField, setFilterField] = useState('name');
  
  // 登分系统状态
  const [showScoringSystem, setShowScoringSystem] = useState(false);

  // 学生空间状态
  const [selectedStudentForSpace, setSelectedStudentForSpace] = useState<Student | null>(null);
  const [showTagGenerator, setShowTagGenerator] = useState(false);

  // 手动添加学生状态
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: '', class: '' });
  
  // 导出Excel相关状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    basicInfo: true,
    customFields: true,
    examScores: false,
    feedbackCounts: false
  });
  const [examResults, setExamResults] = useState<any[]>([]);
  const [feedbackRecords, setFeedbackRecords] = useState<any[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Excel文件没有数据');
      }

      // 获取所有列名
      const columns = Object.keys(jsonData[0] as any);
      
      // 设置Excel数据，进入列映射模式
      setExcelData({ columns, rows: jsonData });
      
      // 初始化列映射 - 只需要必填的姓名和班级
      const initialMappings: ColumnMapping[] = [];
      const unmappedColumns: string[] = [];
      
      columns.forEach(column => {
        // 尝试智能匹配必填标签
        const lowerColumn = column.toLowerCase();
        if (lowerColumn.includes('姓名') || lowerColumn.includes('name')) {
          initialMappings.push({ column, field: 'name' });
        } else if (lowerColumn.includes('班级') || lowerColumn.includes('class')) {
          initialMappings.push({ column, field: 'class' });
        } else {
          // 其他列默认作为自定义标签候选
          unmappedColumns.push(column);
        }
      });
      
      setColumnMappings(initialMappings);
      setSelectedAsCustomFields(unmappedColumns); // 默认将未映射的列作为自定义标签

      toast({
        title: "文件解析成功",
        description: `发现 ${columns.length} 个列，${jsonData.length} 行数据，请配置列映射`,
      });
    } catch (error: any) {
      console.error('Excel解析错误:', error);
      toast({
        title: "导入失败",
        description: error.message || "请检查Excel文件格式是否正确",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateColumnMapping = (column: string, field: string) => {
    setColumnMappings(prev => {
      const filtered = prev.filter(m => m.column !== column && m.field !== field);
      if (field === 'none') {
        return filtered;
      }
      return [...filtered, { column, field }];
    });
  };

  const toggleCustomField = (column: string) => {
    setSelectedAsCustomFields(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const confirmImport = async () => {
    if (!excelData) return;

    try {
      // 创建新的自定义标签（不传id，让数据库自动生成UUID）
      const newCustomFields = selectedAsCustomFields.map(column => ({
        name: column,
        type: 'text' as const,
      }));

      // 更新自定义标签并保存到数据库，等待完成
      let updatedFields = [...customFields];
      if (newCustomFields.length > 0) {
        updatedFields = [...customFields, ...newCustomFields];
        await saveCustomFields(updatedFields);
        // 重新加载数据以获取正确的标签ID
        await loadData();
        // 使用更新后的标签列表
        updatedFields = customFields;
      }

      // 创建学生数据（不传id，让数据库自动生成UUID）
      const newStudents: Student[] = excelData.rows.map((row: any, index) => {
        const student: Student = {
          name: '',
          class: '',
        };

        // 应用列映射
        columnMappings.forEach(mapping => {
          if (mapping.field === 'name' || mapping.field === 'class') {
            student[mapping.field] = String(row[mapping.column] || '').trim();
          } else {
            // 映射到现有自定义标签
            student[mapping.field] = String(row[mapping.column] || '').trim();
          }
        });

        // 添加自定义标签数据
        selectedAsCustomFields.forEach(column => {
          student[column] = String(row[column] || '').trim();
        });

        return student;
      });

      // 检测重复学生（同名同姓）
      const duplicates: Student[] = [];
      const uniqueStudents: Student[] = [];

      newStudents.forEach(newStudent => {
        const existingStudent = students.find(s => 
          s.name === newStudent.name && s.class === newStudent.class
        );
        
        if (existingStudent) {
          duplicates.push(newStudent);
        } else {
          uniqueStudents.push(newStudent);
        }
      });

      if (duplicates.length > 0) {
        // 有重复学生，显示确认对话框
        setDuplicateStudents(duplicates);
        setPendingStudents(uniqueStudents);
        setShowDuplicateDialog(true);
      } else {
        // 没有重复，直接添加并保存到数据库
        const allStudents = [...students, ...newStudents];
        await saveStudents(allStudents);
        
        // 重置状态
        setExcelData(null);
        setColumnMappings([]);
        setSelectedAsCustomFields([]);

        toast({
          title: "导入成功",
          description: `成功导入 ${newStudents.length} 名学生信息`,
        });
      }
    } catch (error: any) {
      console.error('数据导入错误:', error);
      toast({
        title: "导入失败",
        description: error.message || "数据处理出错，请重试",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateChoice = async (overwrite: boolean) => {
    try {
      if (overwrite) {
        // 覆盖重复学生信息
        const updatedStudents = students.map(existingStudent => {
          const duplicate = duplicateStudents.find(d => 
            d.name === existingStudent.name && d.class === existingStudent.class
          );
          return duplicate ? { ...duplicate, id: existingStudent.id } : existingStudent;
        });
        
        const allStudents = [...updatedStudents, ...pendingStudents];
        await saveStudents(allStudents);
        
        toast({
          title: "导入成功",
          description: `成功导入 ${pendingStudents.length} 名新学生，覆盖 ${duplicateStudents.length} 名重复学生信息`,
        });
      } else {
        // 跳过重复学生，只导入新学生
        const allStudents = [...students, ...pendingStudents];
        await saveStudents(allStudents);
        
        toast({
          title: "导入成功",
          description: `成功导入 ${pendingStudents.length} 名新学生，跳过 ${duplicateStudents.length} 名重复学生`,
        });
      }

      // 重置状态
      setExcelData(null);
      setColumnMappings([]);
      setSelectedAsCustomFields([]);
      setDuplicateStudents([]);
      setPendingStudents([]);
      setShowDuplicateDialog(false);
    } catch (error) {
      toast({
        title: "保存失败",
        description: "数据保存出错，请重试",
        variant: "destructive",
      });
    }
  };

  const cancelImport = () => {
    setExcelData(null);
    setColumnMappings([]);
    setSelectedAsCustomFields([]);
  };

  const addCustomField = async () => {
    if (!newFieldName.trim()) return;
    
    const newField: CustomField = {
      // Don't set id, let database generate UUID
      name: newFieldName,
      type: newFieldType,
    };
    
    try {
      const updatedFields = [...customFields, newField];
      await saveCustomFields(updatedFields);
      setNewFieldName('');
      setNewFieldType('text');
      toast({
        title: "标签添加成功",
        description: `已添加自定义标签: ${newFieldName}`,
      });
    } catch (error) {
      toast({
        title: "保存标签失败",
        description: "添加标签时发生错误，请重试",
        variant: "destructive",
      });
    }
  };

  const removeCustomField = async (fieldId: string) => {
    try {
      await deleteCustomFieldFromDB(fieldId);
    } catch (error) {
      // Error is already handled in deleteCustomFieldFromDB
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    try {
      const updatedStudents = students.map(student => 
        student.id === updatedStudent.id ? updatedStudent : student
      );
      await saveStudents(updatedStudents);
      setEditingStudent(null);
      toast({
        title: "更新成功",
        description: "学生信息已更新",
      });
    } catch (error) {
      // Error is already handled in saveStudents
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      await deleteStudentFromDB(studentId);
    } catch (error) {
      // Error is already handled in deleteStudentFromDB
    }
  };

  const exportToExcel = async () => {
    try {
      // 准备基础学生数据
      let exportData = students.map(student => {
        const data: any = {};
        
        // 基本信息
        if (exportOptions.basicInfo) {
          data['姓名'] = student.name;
          data['班级'] = student.class;
        }
        
        // 自定义字段
        if (exportOptions.customFields) {
          customFields.forEach(field => {
            data[field.name] = student[field.name] || '';
          });
        }
        
        return { ...data, studentId: student.id };
      });

      // 获取考试成绩数据
      if (exportOptions.examScores && user) {
        const { data: exams } = await supabase
          .from('exams')
          .select('id, name')
          .eq('user_id', user.id);
          
        const { data: results } = await supabase
          .from('exam_results')
          .select('student_id, exam_id, total_score, correct_count')
          .eq('user_id', user.id);
          
        if (exams && results) {
          // 为每个考试添加成绩列
          exams.forEach(exam => {
            exportData = exportData.map(row => {
              const result = results.find(r => r.student_id === row.studentId && r.exam_id === exam.id);
              return {
                ...row,
                [`${exam.name}_总分`]: result?.total_score || 0,
                [`${exam.name}_正确题数`]: result?.correct_count || 0
              };
            });
          });
        }
      }

      // 获取反馈数据
      if (exportOptions.feedbackCounts && user) {
        const { data: feedbacks } = await supabase
          .from('feedback_records')
          .select('student_id, mood')
          .eq('user_id', user.id);
          
        if (feedbacks) {
          // 统计每个学生的反馈次数
          const feedbackCounts = feedbacks.reduce((acc: any, feedback) => {
            const studentId = feedback.student_id;
            if (!acc[studentId]) {
              acc[studentId] = { total: 0, positive: 0, negative: 0, neutral: 0 };
            }
            acc[studentId].total++;
            if (['happy', 'excited', 'proud'].includes(feedback.mood)) {
              acc[studentId].positive++;
            } else if (['sad', 'angry', 'frustrated'].includes(feedback.mood)) {
              acc[studentId].negative++;
            } else {
              acc[studentId].neutral++;
            }
            return acc;
          }, {});
          
          exportData = exportData.map(row => ({
            ...row,
            '反馈总次数': feedbackCounts[row.studentId]?.total || 0,
            '积极反馈': feedbackCounts[row.studentId]?.positive || 0,
            '消极反馈': feedbackCounts[row.studentId]?.negative || 0,
            '中性反馈': feedbackCounts[row.studentId]?.neutral || 0
          }));
        }
      }

      // 移除临时的studentId字段
      exportData = exportData.map(row => {
        const { studentId, ...rest } = row;
        return rest;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "学生信息");
      XLSX.writeFile(workbook, `学生信息导出_${new Date().toLocaleDateString()}.xlsx`);
      
      setShowExportDialog(false);
      toast({
        title: "导出成功",
        description: "学生信息已导出到Excel文件",
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出过程中发生错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 手动添加学生
  const addStudentManually = async () => {
    if (!newStudent.name?.trim()) {
      toast({
        title: "姓名不能为空",
        description: "请输入学生姓名",
        variant: "destructive",
      });
      return;
    }

    try {
      const studentToAdd: Student = {
        name: newStudent.name.trim(),
        class: newStudent.class?.trim() || '',
        ...customFields.reduce((acc, field) => {
          acc[field.name] = newStudent[field.name] || '';
          return acc;
        }, {} as any)
      };

      const updatedStudents = [...students, studentToAdd];
      await saveStudents(updatedStudents);
      
      // 重置表单并关闭对话框
      setNewStudent({ name: '', class: '' });
      setShowAddStudentDialog(false);
      
      toast({
        title: "添加成功",
        description: `学生 ${studentToAdd.name} 已添加`,
      });
    } catch (error) {
      toast({
        title: "添加失败",
        description: "添加学生失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 如果显示登分系统，渲染登分系统组件
  if (showScoringSystem) {
    return <ScoringSystem students={students} onClose={() => setShowScoringSystem(false)} />;
  }

  // 如果显示学生空间，渲染学生空间组件
  if (selectedStudentForSpace) {
    return (
      <StudentSpace 
        student={selectedStudentForSpace} 
        onClose={() => setSelectedStudentForSpace(null)} 
      />
    );
  }

  // 如果显示标签生成器，渲染标签生成器组件
  if (showTagGenerator) {
    return <TagGenerator students={students} onClose={() => setShowTagGenerator(false)} />;
  }

  // 显示加载状态
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载学生数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">学生总数</p>
                <p className="text-3xl font-bold text-primary mt-2">{students.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant cursor-pointer transition-all" onClick={() => setShowScoringSystem(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">登分系统</p>
                <p className="text-sm text-accent-foreground mt-2">快速录入成绩</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant cursor-pointer transition-all" onClick={() => navigate('/feedback')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">反馈系统</p>
                <p className="text-sm text-accent-foreground mt-2">AI 辅助反馈</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant cursor-pointer transition-all" onClick={() => setShowExportDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">数据导出</p>
                <p className="text-sm text-accent-foreground mt-2">Excel 导出</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要功能区 */}
      <Card className="border-0 shadow-elegant">
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="border-b bg-muted/30">
            <TabsList className="h-auto p-2 bg-transparent w-full justify-start gap-2">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Upload className="w-4 h-4 mr-2" />
                数据导入
              </TabsTrigger>
              <TabsTrigger value="students" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Users className="w-4 h-4 mr-2" />
                学生管理
              </TabsTrigger>
              <TabsTrigger value="classes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                班级空间
              </TabsTrigger>
              <TabsTrigger value="generator" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Plus className="w-4 h-4 mr-2" />
                标签生成器
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Settings className="w-4 h-4 mr-2" />
                标签设置
              </TabsTrigger>
              <TabsTrigger value="formula" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
                <Edit className="w-4 h-4 mr-2" />
                公式编辑
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="p-6 space-y-6">
            {!excelData ? (
              // Upload Section
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">导入学生数据</h3>
                  <p className="text-sm text-muted-foreground">上传 Excel 文件快速导入学生信息，支持自定义标签映射</p>
                </div>
                <div 
                  className="relative border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group"
                  onClick={() => document.getElementById('excel-upload')?.click()}
                >
                  <div className="space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-accent flex items-center justify-center mx-auto shadow-glow group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-foreground">
                        点击或拖拽上传 Excel 文件
                      </p>
                      <p className="text-sm text-muted-foreground">
                        支持 .xlsx 和 .xls 格式，自动识别列标题
                      </p>
                    </div>
                  </div>
                  <Input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <div className="flex items-center gap-3 text-accent">
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">正在解析文件...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 手动添加学生按钮 */}
                <div className="flex justify-center pt-6 border-t">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => setShowAddStudentDialog(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    手动添加学生
                  </Button>
                </div>
              </div>
            ) : (
              // Column Mapping Section
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-accent" />
                    配置列映射
                  </CardTitle>
                   <CardDescription>
                     必须映射姓名和班级标签，其他标签可选择映射或作为自定义标签
                   </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">发现数据：</p>
                    <p className="text-sm text-muted-foreground">
                      {excelData.columns.length} 个列，{excelData.rows.length} 行数据
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">标签映射</h4>
                    {excelData.columns.map(column => {
                      const currentMapping = columnMappings.find(m => m.column === column);
                      const isCustomField = selectedAsCustomFields.includes(column);
                      
                      return (
                        <div key={column} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{column}</div>
                            <div className="text-xs text-muted-foreground">
                              示例数据: {excelData.rows[0]?.[column] || '无数据'}
                            </div>
                          </div>
                          
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          
                          <div className="flex-1">
                            <Select
                              value={
                                currentMapping?.field || 
                                (isCustomField ? `new_field_${column}` : 'none')
                              }
                              onValueChange={(value) => {
                                if (value.startsWith('new_field_')) {
                                  // 选择了新建自定义标签
                                  updateColumnMapping(column, 'none');
                                  if (!selectedAsCustomFields.includes(column)) {
                                    toggleCustomField(column);
                                  }
                                } else {
                                  // 选择了其他标签映射
                                  updateColumnMapping(column, value);
                                  if (selectedAsCustomFields.includes(column)) {
                                    toggleCustomField(column);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择标签" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="none">不映射</SelectItem>
                                 <SelectItem value="name">姓名 (必填)</SelectItem>
                                 <SelectItem value="class">班级 (必填)</SelectItem>
                                 {customFields.map(field => (
                                   <SelectItem key={field.id} value={field.name}>
                                     {field.name} (现有自定义标签)
                                   </SelectItem>
                                 ))}
                                 <SelectItem value={`new_field_${column}`}>
                                   作为新建自定义标签
                                 </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedAsCustomFields.length > 0 && (
                    <div className="bg-accent/10 p-4 rounded-lg">
                      <h5 className="font-medium text-sm mb-2">将创建的自定义标签：</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedAsCustomFields.map(field => (
                          <Badge key={field} variant="secondary">{field}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button onClick={confirmImport} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      确认导入
                    </Button>
                    <Button onClick={cancelImport} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">总学生数</p>
                      <p className="text-2xl font-bold text-primary">{students.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">自定义标签</p>
                      <p className="text-2xl font-bold text-primary">{customFields.length}</p>
                    </div>
                    <Settings className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-muted-foreground">班级数量</p>
                       <p className="text-2xl font-bold text-primary">
                         {new Set(students.map(s => s.class).filter(Boolean)).size}
                       </p>
                     </div>
                    <FileSpreadsheet className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* Students Filter and Display Controls */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>学生列表</CardTitle>
                      <CardDescription>管理所有学生信息</CardDescription>
                    </div>
                    <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="w-4 h-4 mr-2" />
                          添加学生
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>添加新学生</DialogTitle>
                          <DialogDescription>
                            请填写学生的基本信息和自定义标签
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="student-name" className="text-right">
                              姓名 *
                            </Label>
                            <Input
                              id="student-name"
                              value={newStudent.name || ''}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                              className="col-span-3"
                              placeholder="请输入学生姓名"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="student-class" className="text-right">
                              班级
                            </Label>
                            <Input
                              id="student-class"
                              value={newStudent.class || ''}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, class: e.target.value }))}
                              className="col-span-3"
                              placeholder="请输入班级名称"
                            />
                          </div>
                          {customFields.map(field => (
                            <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor={`field-${field.id}`} className="text-right">
                                {field.name}
                              </Label>
                              <Input
                                id={`field-${field.id}`}
                                type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                                value={newStudent[field.name] || ''}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, [field.name]: e.target.value }))}
                                className="col-span-3"
                                placeholder={`请输入${field.name}`}
                              />
                            </div>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddStudentDialog(false)}>
                            取消
                          </Button>
                          <Button onClick={addStudentManually}>
                            添加学生
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-48">
                      <Label htmlFor="filter">筛选学生</Label>
                      <Input
                        id="filter"
                        placeholder="输入搜索内容..."
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Label htmlFor="filter-field">筛选标签</Label>
                      <Select value={filterField} onValueChange={setFilterField}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="name">姓名</SelectItem>
                           <SelectItem value="class">班级</SelectItem>
                           {customFields.filter(f => visibleFields.includes(f.name)).map(field => (
                             <SelectItem key={field.id} value={field.name}>{field.name}</SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                  </div>


                 <div className="flex flex-wrap gap-2">
                   <Label className="text-sm font-medium">显示标签:</Label>
                   {customFields.map(field => (
                     <label key={field.id} className="flex items-center gap-1 text-sm">
                       <input
                         type="checkbox"
                         checked={visibleFields.includes(field.name)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setVisibleFields(prev => [...prev, field.name]);
                           } else {
                             setVisibleFields(prev => prev.filter(f => f !== field.name));
                           }
                         }}
                       />
                       {field.name}
                     </label>
                   ))}
                 </div>

                 {students.length === 0 ? (
                   <div className="text-center py-12">
                     <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                     <h3 className="text-lg font-medium text-muted-foreground">暂无学生信息</h3>
                     <p className="text-sm text-muted-foreground mt-2">请上传Excel文件导入学生数据，或点击上方"添加学生"按钮手动添加</p>
                   </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                         <tr className="border-b">
                           <th className="text-left p-4 font-medium">姓名</th>
                           <th className="text-left p-4 font-medium">班级</th>
                           {customFields.filter(field => visibleFields.includes(field.name)).map(field => (
                             <th key={field.id} className="text-left p-4 font-medium">{field.name}</th>
                           ))}
                           <th className="text-left p-4 font-medium">操作</th>
                         </tr>
                      </thead>
                      <tbody>
                        {students
                          .filter(student => {
                            if (!filterValue) return true;
                            const fieldValue = student[filterField];
                            return fieldValue && fieldValue.toString().toLowerCase().includes(filterValue.toLowerCase());
                          })
                           .map(student => (
                            <tr 
                              key={student.id} 
                              className="border-b hover:bg-muted/50 transition-smooth cursor-pointer"
                              onDoubleClick={() => setSelectedStudentForSpace(student)}
                              title="双击进入学生空间"
                            >
                              <td className="p-4 font-medium">{student.name}</td>
                              <td className="p-4">{student.class}</td>
                              {customFields.filter(field => visibleFields.includes(field.name)).map(field => (
                                <td key={field.id} className="p-4">{student[field.name] || '-'}</td>
                              ))}
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStudent(student);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteStudent(student.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                         ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <ClassSpace 
              students={students} 
              onUpdateStudents={saveStudents}
              onUpdateStudentClass={updateStudentClass}
              onUpdateClassName={updateClassNameForAllStudents}
              onStudentDoubleClick={setSelectedStudentForSpace}
            />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <TagGenerator students={students} onClose={() => {}} />
          </TabsContent>

          <TabsContent value="formula" className="space-y-6">
            <FormulaFieldEditor students={students} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Custom Fields Management */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>自定义标签管理</CardTitle>
                <CardDescription>添加或删除学生信息的自定义标签</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="field-name">标签名称</Label>
                    <Input
                      id="field-name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="输入标签名称"
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="field-type">标签类型</Label>
                    <select
                      id="field-type"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="text">文本</option>
                      <option value="number">数字</option>
                      <option value="date">日期</option>
                      <option value="email">邮箱</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addCustomField} disabled={!newFieldName.trim()}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加标签
                    </Button>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">已添加的标签</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customFields.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{field.name}</span>
                            <Badge variant="secondary" className="ml-2">{field.type}</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeCustomField(field.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tag Drag Management */}
            <TagDragSystem 
              students={students}
              customFields={customFields}
              onUpdateStudents={saveStudents}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* 导出Excel选项对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              导出Excel选项
            </DialogTitle>
            <DialogDescription>
              选择要导出到Excel文件中的信息类型
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="basic-info"
                  checked={exportOptions.basicInfo}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, basicInfo: !!checked }))
                  }
                />
                <Label htmlFor="basic-info" className="text-sm font-medium">
                  基本信息 (姓名、班级)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-fields"
                  checked={exportOptions.customFields}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, customFields: !!checked }))
                  }
                />
                <Label htmlFor="custom-fields" className="text-sm font-medium">
                  自定义标签
                </Label>
                {customFields.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({customFields.length} 个标签)
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exam-scores"
                  checked={exportOptions.examScores}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, examScores: !!checked }))
                  }
                />
                <Label htmlFor="exam-scores" className="text-sm font-medium">
                  考试成绩
                </Label>
                <span className="text-xs text-muted-foreground">
                  (总分和正确题数)
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="feedback-counts"
                  checked={exportOptions.feedbackCounts}
                  onCheckedChange={(checked) => 
                    setExportOptions(prev => ({ ...prev, feedbackCounts: !!checked }))
                  }
                />
                <Label htmlFor="feedback-counts" className="text-sm font-medium">
                  反馈统计
                </Label>
                <span className="text-xs text-muted-foreground">
                  (反馈次数和情感分布)
                </span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">提示：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>至少选择一种信息类型才能导出</li>
                <li>成绩和反馈数据需要从数据库获取，可能需要一些时间</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={exportToExcel}
              disabled={!Object.values(exportOptions).some(Boolean)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal - Optimized for better display */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>编辑学生信息</CardTitle>
              <CardDescription>修改学生的基本信息和自定义标签</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* 基本信息区域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label htmlFor="edit-name">姓名 *</Label>
                  <Input
                    id="edit-name"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    placeholder="请输入学生姓名"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-class">班级</Label>
                  <Input
                    id="edit-class"
                    value={editingStudent.class}
                    onChange={(e) => setEditingStudent({...editingStudent, class: e.target.value})}
                    placeholder="请输入班级名称"
                  />
                </div>
              </div>

              {/* 自定义标签区域 */}
              {customFields.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">自定义标签</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map(field => (
                      <div key={field.id}>
                        <Label htmlFor={`edit-${field.id}`}>
                          {field.name}
                          <Badge variant="secondary" className="ml-1 text-xs">{field.type}</Badge>
                        </Label>
                        <Input
                          id={`edit-${field.id}`}
                          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                          value={editingStudent[field.name] || ''}
                          onChange={(e) => setEditingStudent({
                            ...editingStudent,
                            [field.name]: e.target.value
                          })}
                          placeholder={`请输入${field.name}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            
            {/* 操作按钮区域 */}
            <div className="flex-shrink-0 p-6 pt-0">
              <div className="flex gap-3">
                <Button onClick={() => updateStudent(editingStudent)} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  保存修改
                </Button>
                <Button variant="outline" onClick={() => setEditingStudent(null)} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Duplicate Students Dialog */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>发现重复学生</CardTitle>
              <CardDescription>
                发现 {duplicateStudents.length} 名重复学生（同名同班级），请选择处理方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                <h4 className="font-medium mb-2">重复学生列表：</h4>
                {duplicateStudents.map((student, index) => (
                  <div key={index} className="flex justify-between py-1 text-sm">
                    <span>{student.name}</span>
                    <span className="text-muted-foreground">{student.class}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => handleDuplicateChoice(true)} 
                  className="w-full"
                  variant="default"
                >
                  覆盖现有信息
                </Button>
                <Button 
                  onClick={() => handleDuplicateChoice(false)} 
                  className="w-full"
                  variant="outline"
                >
                  跳过重复学生
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;