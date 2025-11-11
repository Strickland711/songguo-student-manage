import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Save, Trash2, Eye } from 'lucide-react';
import { useClassroomData } from '@/hooks/useClassroomData';
import { useStudentData, Student } from '@/hooks/useStudentData';
import { cn } from '@/lib/utils';

export const ClassroomRecorder = () => {
  const { sessions, loading, createSession, updateSession, deleteSession, loadAttendanceRecords, batchSaveAttendanceRecords } = useClassroomData();
  const { students } = useStudentData();
  
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  
  // New session form
  const [newSessionData, setNewSessionData] = useState({
    class_name: '',
    lesson_title: '',
    lesson_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  // Attendance records
  const [attendanceData, setAttendanceData] = useState<Record<string, {
    status: string;
    homework_completed: boolean;
    homework_notes: string;
    listening_score: number;
    listening_notes: string;
  }>>({});
  
  const [currentSessionStudents, setCurrentSessionStudents] = useState<Student[]>([]);
  
  const classes = Array.from(new Set(students.map(s => s.class)));
  
  const handleCreateSession = async () => {
    if (!newSessionData.class_name || !newSessionData.lesson_title) return;
    
    await createSession(newSessionData);
    setShowNewSessionDialog(false);
    setNewSessionData({
      class_name: '',
      lesson_title: '',
      lesson_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };
  
  const handleOpenRecordDialog = async (sessionId: string) => {
    setSelectedSession(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Filter students by class
    const classStudents = students.filter(s => s.class === session.class_name);
    setCurrentSessionStudents(classStudents);
    
    // Load existing attendance records
    const records = await loadAttendanceRecords(sessionId);
    const recordsMap: Record<string, any> = {};
    
    classStudents.forEach(student => {
      const existingRecord = records?.find(r => r.student_id === student.id);
      recordsMap[student.id] = {
        status: existingRecord?.status || 'present',
        homework_completed: existingRecord?.homework_completed || false,
        homework_notes: existingRecord?.homework_notes || '',
        listening_score: existingRecord?.listening_score || 5,
        listening_notes: existingRecord?.listening_notes || '',
      };
    });
    
    setAttendanceData(recordsMap);
    setShowRecordDialog(true);
  };
  
  const handleSaveAttendance = async () => {
    if (!selectedSession) return;
    
    const records = Object.entries(attendanceData).map(([studentId, data]) => ({
      session_id: selectedSession,
      student_id: studentId,
      status: data.status,
      homework_completed: data.homework_completed,
      homework_notes: data.homework_notes,
      listening_score: data.listening_score,
      listening_notes: data.listening_notes,
    }));
    
    await batchSaveAttendanceRecords(records);
    setShowRecordDialog(false);
  };
  
  const updateAttendanceField = (studentId: string, field: string, value: any) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }));
  };

  if (loading) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">课堂记录</h2>
        <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建课堂
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新课堂记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选择班级</Label>
                <Select value={newSessionData.class_name} onValueChange={(value) => setNewSessionData(prev => ({ ...prev, class_name: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(className => (
                      <SelectItem key={className} value={className}>{className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>讲次标题</Label>
                <Input 
                  value={newSessionData.lesson_title}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, lesson_title: e.target.value }))}
                  placeholder="例如：第一讲"
                />
              </div>
              <div>
                <Label>上课日期</Label>
                <Input 
                  type="date"
                  value={newSessionData.lesson_date}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, lesson_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>备注</Label>
                <Textarea 
                  value={newSessionData.notes}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="课堂备注"
                />
              </div>
              <Button onClick={handleCreateSession} className="w-full">创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(session => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div>
                  <div className="text-lg">{session.lesson_title}</div>
                  <div className="text-sm text-muted-foreground">{session.class_name}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSession(session.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>日期: {session.lesson_date}</div>
                {session.notes && <div className="text-muted-foreground">{session.notes}</div>}
              </div>
              <Button 
                className="w-full mt-4"
                onClick={() => handleOpenRecordDialog(session.id)}
              >
                <Eye className="w-4 h-4 mr-2" />
                记录考勤
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>记录学生考勤与表现</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentSessionStudents.map(student => (
              <Card key={student.id}>
                <CardHeader>
                  <CardTitle className="text-base">{student.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>出勤状态</Label>
                      <Select 
                        value={attendanceData[student.id]?.status || 'present'}
                        onValueChange={(value) => updateAttendanceField(student.id, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">出勤</SelectItem>
                          <SelectItem value="absent">缺勤</SelectItem>
                          <SelectItem value="late">迟到</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>课堂表现评分 (1-10)</Label>
                      <Input 
                        type="number"
                        min="1"
                        max="10"
                        value={attendanceData[student.id]?.listening_score || 5}
                        onChange={(e) => updateAttendanceField(student.id, 'listening_score', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={attendanceData[student.id]?.homework_completed || false}
                      onCheckedChange={(checked) => updateAttendanceField(student.id, 'homework_completed', checked)}
                    />
                    <Label>作业已完成</Label>
                  </div>
                  <div>
                    <Label>作业备注</Label>
                    <Textarea 
                      value={attendanceData[student.id]?.homework_notes || ''}
                      onChange={(e) => updateAttendanceField(student.id, 'homework_notes', e.target.value)}
                      placeholder="作业完成情况说明"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>课堂表现备注</Label>
                    <Textarea 
                      value={attendanceData[student.id]?.listening_notes || ''}
                      onChange={(e) => updateAttendanceField(student.id, 'listening_notes', e.target.value)}
                      placeholder="课堂表现说明"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>取消</Button>
            <Button onClick={handleSaveAttendance}>
              <Save className="w-4 h-4 mr-2" />
              保存考勤记录
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
