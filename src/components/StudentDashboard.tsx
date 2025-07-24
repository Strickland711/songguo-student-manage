import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, Users, FileSpreadsheet, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  name: string;
  studentId: string;
  email: string;
  grade: string;
  [key: string]: any; // 允许动态字段
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email';
}

const StudentDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'email'>('text');
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

      const newStudents: Student[] = jsonData.map((row: any, index) => ({
        id: `student-${Date.now()}-${index}`,
        name: row['姓名'] || row['Name'] || row['name'] || '',
        studentId: row['学号'] || row['Student ID'] || row['studentId'] || '',
        email: row['邮箱'] || row['Email'] || row['email'] || '',
        grade: row['年级'] || row['Grade'] || row['grade'] || '',
        ...row // 保留其他所有字段
      }));

      setStudents(prev => [...prev, ...newStudents]);
      toast({
        title: "导入成功",
        description: `成功导入 ${newStudents.length} 名学生信息`,
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
            {/* Upload Section */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-accent" />
                  Excel文件上传
                </CardTitle>
                <CardDescription>
                  上传包含学生信息的Excel文件，系统将自动识别并导入数据
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
                      支持.xlsx和.xls格式，建议包含姓名、学号、邮箱、年级等基础信息
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
                      <p className="text-sm font-medium text-muted-foreground">年级覆盖</p>
                      <p className="text-2xl font-bold text-primary">
                        {new Set(students.map(s => s.grade).filter(Boolean)).size}
                      </p>
                    </div>
                    <FileSpreadsheet className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* Students Table */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>学生列表</CardTitle>
                <CardDescription>管理所有学生信息</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <th className="text-left p-4 font-medium">学号</th>
                          <th className="text-left p-4 font-medium">邮箱</th>
                          <th className="text-left p-4 font-medium">年级</th>
                          {customFields.map(field => (
                            <th key={field.id} className="text-left p-4 font-medium">{field.name}</th>
                          ))}
                          <th className="text-left p-4 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id} className="border-b hover:bg-muted/50 transition-smooth">
                            <td className="p-4 font-medium">{student.name}</td>
                            <td className="p-4">{student.studentId}</td>
                            <td className="p-4">{student.email}</td>
                            <td className="p-4">{student.grade}</td>
                            {customFields.map(field => (
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
                <Label>姓名</Label>
                <Input
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                />
              </div>
              <div>
                <Label>学号</Label>
                <Input
                  value={editingStudent.studentId}
                  onChange={(e) => setEditingStudent({...editingStudent, studentId: e.target.value})}
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                />
              </div>
              <div>
                <Label>年级</Label>
                <Input
                  value={editingStudent.grade}
                  onChange={(e) => setEditingStudent({...editingStudent, grade: e.target.value})}
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
    </div>
  );
};

export default StudentDashboard;