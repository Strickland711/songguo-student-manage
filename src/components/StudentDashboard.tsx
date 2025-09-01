import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Users, FileSpreadsheet, Settings, Plus, Edit, Trash2, ArrowRight, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  name: string;
  class: string;
  [key: string]: any; // 允许动态字段
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email';
}

interface ColumnMapping {
  column: string;
  field: string;
}

interface ExcelData {
  columns: string[];
  rows: any[];
}

const StudentDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
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
  
  const { toast } = useToast();

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
        // 尝试智能匹配必填字段
        const lowerColumn = column.toLowerCase();
        if (lowerColumn.includes('姓名') || lowerColumn.includes('name')) {
          initialMappings.push({ column, field: 'name' });
        } else if (lowerColumn.includes('班级') || lowerColumn.includes('class')) {
          initialMappings.push({ column, field: 'class' });
        } else {
          // 其他列默认作为自定义字段候选
          unmappedColumns.push(column);
        }
      });
      
      setColumnMappings(initialMappings);
      setSelectedAsCustomFields(unmappedColumns); // 默认将未映射的列作为自定义字段

      toast({
        title: "文件解析成功",
        description: `发现 ${columns.length} 个列，${jsonData.length} 行数据，请配置列映射`,
      });
    } catch (error) {
      toast({
        title: "导入失败",
        description: "请检查Excel文件格式是否正确",
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

  const confirmImport = () => {
    if (!excelData) return;

    try {
      // 创建新的自定义字段
      const newCustomFields = selectedAsCustomFields.map(column => ({
        id: `field-${Date.now()}-${column}`,
        name: column,
        type: 'text' as const,
      }));

      // 更新自定义字段
      setCustomFields(prev => [...prev, ...newCustomFields]);

      // 创建学生数据
      const newStudents: Student[] = excelData.rows.map((row: any, index) => {
        const student: Student = {
          id: `student-${Date.now()}-${index}`,
          name: '',
          class: '',
        };

        // 应用列映射
        columnMappings.forEach(mapping => {
          student[mapping.field as keyof Student] = row[mapping.column] || '';
        });

        // 添加自定义字段数据
        selectedAsCustomFields.forEach(column => {
          student[column] = row[column] || '';
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
        // 没有重复，直接添加
        setStudents(prev => [...prev, ...newStudents]);
        
        // 重置状态
        setExcelData(null);
        setColumnMappings([]);
        setSelectedAsCustomFields([]);

        toast({
          title: "导入成功",
          description: `成功导入 ${newStudents.length} 名学生信息`,
        });
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: "数据处理出错，请重试",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateChoice = (overwrite: boolean) => {
    if (overwrite) {
      // 覆盖重复学生信息
      const updatedStudents = students.map(existingStudent => {
        const duplicate = duplicateStudents.find(d => 
          d.name === existingStudent.name && d.class === existingStudent.class
        );
        return duplicate ? { ...duplicate, id: existingStudent.id } : existingStudent;
      });
      
      setStudents([...updatedStudents, ...pendingStudents]);
      
      toast({
        title: "导入成功",
        description: `成功导入 ${pendingStudents.length} 名新学生，覆盖 ${duplicateStudents.length} 名重复学生信息`,
      });
    } else {
      // 跳过重复学生，只导入新学生
      setStudents(prev => [...prev, ...pendingStudents]);
      
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
  };

  const cancelImport = () => {
    setExcelData(null);
    setColumnMappings([]);
    setSelectedAsCustomFields([]);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: newFieldName,
      type: newFieldType,
    };
    
    setCustomFields(prev => [...prev, newField]);
    setNewFieldName('');
    setNewFieldType('text');
    toast({
      title: "字段添加成功",
      description: `已添加自定义字段: ${newFieldName}`,
    });
  };

  const removeCustomField = (fieldId: string) => {
    setCustomFields(prev => prev.filter(field => field.id !== fieldId));
      // 同时从所有学生数据中移除该字段
      const fieldName = customFields.find(f => f.id === fieldId)?.name;
      if (fieldName) {
        setStudents(prev => prev.map(student => {
          const { [fieldName]: removed, ...rest } = student;
          return rest as Student;
        }));
      }
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(student => 
      student.id === updatedStudent.id ? updatedStudent : student
    ));
    setEditingStudent(null);
    toast({
      title: "更新成功",
      description: "学生信息已更新",
    });
  };

  const deleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(student => student.id !== studentId));
    toast({
      title: "删除成功",
      description: "学生信息已删除",
    });
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "学生信息");
    XLSX.writeFile(workbook, `学生信息导出_${new Date().toLocaleDateString()}.xlsx`);
    toast({
      title: "导出成功",
      description: "学生信息已导出到Excel文件",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">学生管理系统</h1>
            <p className="text-muted-foreground mt-2">高效管理学生信息，支持Excel导入和自定义字段</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Users className="w-4 h-4 mr-1" />
              {students.length} 名学生
            </Badge>
            <Button onClick={exportToExcel} variant="outline" disabled={students.length === 0}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="dashboard">仪表板</TabsTrigger>
            <TabsTrigger value="students">学生管理</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {!excelData ? (
              // Upload Section
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-accent" />
                    Excel文件上传
                  </CardTitle>
                  <CardDescription>
                    上传包含学生信息的Excel文件，然后配置列与字段的对应关系
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <Label htmlFor="excel-upload" className="cursor-pointer">
                        <span className="text-lg font-medium text-primary">
                          点击上传Excel文件
                        </span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        支持.xlsx和.xls格式，上传后可自定义列与字段的映射关系
                      </p>
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
                      <div className="mt-4">
                        <div className="inline-flex items-center gap-2 text-accent">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          正在解析文件...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Column Mapping Section
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-accent" />
                    配置列映射
                  </CardTitle>
                   <CardDescription>
                     必须映射姓名和班级字段，其他字段可选择映射或作为自定义字段
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
                    <h4 className="font-medium">字段映射</h4>
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
                              value={currentMapping?.field || 'none'}
                              onValueChange={(value) => updateColumnMapping(column, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择字段" />
                              </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="none">不映射</SelectItem>
                                 <SelectItem value="name">姓名 (必填)</SelectItem>
                                 <SelectItem value="class">班级 (必填)</SelectItem>
                               </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isCustomField}
                              onChange={() => toggleCustomField(column)}
                              disabled={currentMapping?.field && currentMapping.field !== 'none'}
                              className="rounded"
                            />
                            <span className="text-sm">作为自定义字段</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedAsCustomFields.length > 0 && (
                    <div className="bg-accent/10 p-4 rounded-lg">
                      <h5 className="font-medium text-sm mb-2">将创建的自定义字段：</h5>
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
                      <p className="text-sm font-medium text-muted-foreground">自定义字段</p>
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
                <CardTitle>学生列表</CardTitle>
                <CardDescription>管理所有学生信息</CardDescription>
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
                    <Label htmlFor="filter-field">筛选字段</Label>
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
                   <Label className="text-sm font-medium">显示字段:</Label>
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
                    <p className="text-sm text-muted-foreground mt-2">请先上传Excel文件导入学生数据</p>
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
                           <tr key={student.id} className="border-b hover:bg-muted/50 transition-smooth">
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
                                   onClick={() => setEditingStudent(student)}
                                 >
                                   <Edit className="w-4 h-4" />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="destructive"
                                   onClick={() => deleteStudent(student.id)}
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

          <TabsContent value="settings" className="space-y-6">
            {/* Custom Fields Management */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>自定义字段管理</CardTitle>
                <CardDescription>添加或删除学生信息的自定义字段</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="field-name">字段名称</Label>
                    <Input
                      id="field-name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="输入字段名称"
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="field-type">字段类型</Label>
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
                      添加字段
                    </Button>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">已添加的字段</h4>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Student Modal would go here */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>编辑学生信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>姓名 *</Label>
                <Input
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
               <div>
                 <Label>班级 *</Label>
                 <Input
                   value={editingStudent.class}
                   onChange={(e) => setEditingStudent({...editingStudent, class: e.target.value})}
                 />
               </div>
              {customFields.map(field => (
                <div key={field.id}>
                  <Label>{field.name}</Label>
                  <Input
                    type={field.type}
                    value={editingStudent[field.name] || ''}
                    onChange={(e) => setEditingStudent({
                      ...editingStudent,
                      [field.name]: e.target.value
                    })}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => updateStudent(editingStudent)} className="flex-1">
                  保存
                </Button>
                <Button variant="outline" onClick={() => setEditingStudent(null)} className="flex-1">
                  取消
                </Button>
              </div>
            </CardContent>
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