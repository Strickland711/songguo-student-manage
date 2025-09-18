import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, User, BookOpen, MessageSquare, Target, Star, TrendingUp, Trees } from 'lucide-react';
import { Student } from '@/hooks/useStudentData';
import { useFeedbackData } from '@/hooks/useFeedbackData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PineconeView from './PineconeView';

interface StudentSpaceProps {
  student: Student;
  onClose: () => void;
}

interface FloatingNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'info' | 'exam' | 'feedback' | 'tag';
  title: string;
  content: string;
  color: string;
  size: number;
}

interface ExamResult {
  id: string;
  exam_name: string;
  total_score: number;
  correct_count: number;
  total_questions: number;
  created_at: string;
}

const StudentSpace = ({ student, onClose }: StudentSpaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [nodes, setNodes] = useState<FloatingNode[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [scoringRecords, setScoringRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');
  
  const { feedbackRecords, getFeedbackByStudent } = useFeedbackData();

  // Load student data
  useEffect(() => {
    if (!user || !student.id) return;
    
    const loadStudentData = async () => {
      try {
        // Load exam results
        const { data: examData, error: examError } = await supabase
          .from('exam_results')
          .select(`
            id,
            total_score,
            correct_count,
            created_at,
            exams!inner(name, total_questions)
          `)
          .eq('user_id', user.id)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        if (examError) throw examError;

        const formattedExamResults = (examData || []).map(exam => ({
          id: exam.id,
          exam_name: exam.exams?.name || '未知考试',
          total_score: exam.total_score,
          correct_count: exam.correct_count,
          total_questions: exam.exams?.total_questions || 0,
          created_at: exam.created_at
        }));

        setExamResults(formattedExamResults);

        // Load scoring records
        const { data: scoringData, error: scoringError } = await supabase
          .from('scoring_records')
          .select('*')
          .eq('user_id', user.id)
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        if (scoringError) throw scoringError;
        setScoringRecords(scoringData || []);

        setLoading(false);
      } catch (error: any) {
        console.error('Error loading student data:', error);
        toast({
          title: "加载失败",
          description: "无法加载学生数据",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadStudentData();
  }, [user, student.id]);

  // Create floating nodes with beautiful tag system
  useEffect(() => {
    if (loading) return;

    const studentFeedback = getFeedbackByStudent(student.id || '');
    const newNodes: FloatingNode[] = [];

    // Student basic info node (center) - larger and more prominent
    newNodes.push({
      id: 'student-info',
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      type: 'info',
      title: student.name,
      content: `班级: ${student.class}`,
      color: 'hsl(223, 47%, 11%)',
      size: 100
    });

    // Create tag-based floating balls with more organic positioning
    let nodeIndex = 0;

    // Exam results nodes - green cluster
    examResults.slice(0, 4).forEach((exam, index) => {
      const clusterAngle = Math.PI * 0.3; // Upper right
      const spreadRadius = 80 + index * 30;
      const angle = clusterAngle + (index - 1.5) * 0.4;
      
        newNodes.push({
          id: `exam-${exam.id}`,
          x: 400 + Math.cos(angle) * spreadRadius,
          y: 300 + Math.sin(angle) * spreadRadius,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          type: 'exam',
          title: exam.exam_name.length > 8 ? exam.exam_name.substring(0, 6) + '..' : exam.exam_name,
          content: `${exam.total_score.toFixed(1)}分`,
          color: exam.total_score >= 80 ? 'hsl(142, 71%, 45%)' : 
                 exam.total_score >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)',
          size: 65
        });
    });

    // Feedback nodes - mood-based cluster
    studentFeedback.slice(0, 4).forEach((feedback, index) => {
      const clusterAngle = Math.PI * 1.7; // Lower left
      const spreadRadius = 90 + index * 25;
      const angle = clusterAngle + (index - 1.5) * 0.3;
      
      const moodColors = {
        'happy': 'hsl(142 71% 45%)',
        'neutral': 'hsl(38 92% 50%)', 
        'sad': 'hsl(0 84% 60%)'
      };
      
      newNodes.push({
        id: `feedback-${feedback.id}`,
        x: 400 + Math.cos(angle) * spreadRadius,
        y: 300 + Math.sin(angle) * spreadRadius,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        type: 'feedback',
        title: '反馈',
        content: feedback.mood,
        color: moodColors[feedback.mood as keyof typeof moodColors] || 'hsl(var(--muted))',
        size: 55
      });
    });

    // Scoring records nodes - purple cluster
    scoringRecords.slice(0, 4).forEach((record, index) => {
      const clusterAngle = Math.PI * 0.8; // Upper left
      const spreadRadius = 85 + index * 35;
      const angle = clusterAngle + (index - 1.5) * 0.35;
      
      newNodes.push({
        id: `scoring-${record.id}`,
        x: 400 + Math.cos(angle) * spreadRadius,
        y: 300 + Math.sin(angle) * spreadRadius,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        type: 'tag',
        title: record.category.length > 6 ? record.category.substring(0, 4) + '..' : record.category,
        content: `${record.score}分`,
        color: 'hsl(262 83% 58%)', // Beautiful purple
        size: 50
      });
    });

    setNodes(newNodes);
  }, [loading, examResults, scoringRecords, student, getFeedbackByStudent]);

  // Animation loop with useRef for nodes to avoid dependency issues
  const nodesRef = useRef<FloatingNode[]>([]);
  
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw beautiful gradient background
      const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
      gradient.addColorStop(0, 'hsla(218, 25%, 98%, 0.1)');
      gradient.addColorStop(1, 'hsla(223, 47%, 11%, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw elegant connections from center to other nodes
      const centerNode = currentNodes.find(n => n.id === 'student-info');
      if (centerNode) {
        currentNodes.forEach(node => {
          if (node.id !== 'student-info') {
            // Create gradient line based on node type
            const lineGradient = ctx.createLinearGradient(centerNode.x, centerNode.y, node.x, node.y);
            lineGradient.addColorStop(0, 'hsla(223, 47%, 11%, 0.2)');
            lineGradient.addColorStop(1, 'hsla(223, 47%, 11%, 0.1)');
            
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(centerNode.x, centerNode.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
          }
        });
      }

      // Update and draw nodes with enhanced visuals
      const updatedNodes = currentNodes.map(node => {
        // Smooth floating movement
        let newX = node.x + node.vx;
        let newY = node.y + node.vy;

        // Boundary collision with damping
        if (newX < node.size / 2 || newX > canvas.width - node.size / 2) {
          node.vx *= -0.8;
          newX = Math.max(node.size / 2, Math.min(canvas.width - node.size / 2, newX));
        }
        if (newY < node.size / 2 || newY > canvas.height - node.size / 2) {
          node.vy *= -0.8;
          newY = Math.max(node.size / 2, Math.min(canvas.height - node.size / 2, newY));
        }

        // Gentle attraction to keep center node centered
        if (node.id === 'student-info') {
          const targetX = 400;
          const targetY = 300;
          const dx = targetX - newX;
          const dy = targetY - newY;
          newX += dx * 0.02;
          newY += dy * 0.02;
        }

        // Add subtle gravitational pull toward center for all nodes
        const centerX = 400;
        const centerY = 300;
        const distanceToCenter = Math.sqrt((newX - centerX) ** 2 + (newY - centerY) ** 2);
        if (distanceToCenter > 50 && node.id !== 'student-info') {
          const pullStrength = 0.001;
          const pullX = (centerX - newX) * pullStrength;
          const pullY = (centerY - newY) * pullStrength;
          node.vx += pullX;
          node.vy += pullY;
        }

        // Apply drag to slow down movement
        node.vx *= 0.995;
        node.vy *= 0.995;

        // Draw beautiful node with shadow and glow
        ctx.globalAlpha = 1;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(newX + 3, newY + 3, node.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Main node with gradient
        const nodeGradient = ctx.createRadialGradient(newX, newY, 0, newX, newY, node.size / 2);
        nodeGradient.addColorStop(0, node.color);
        nodeGradient.addColorStop(1, node.color.replace(')', ', 0.8)'));
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(newX, newY, node.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Elegant border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner glow
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.stroke();

        // Text with better styling
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.font = `bold ${Math.max(11, node.size / 7)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(node.title, newX, newY - 6);
        
        ctx.font = `${Math.max(9, node.size / 9)}px system-ui`;
        ctx.fillText(node.content, newX, newY + 8);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        return { ...node, x: newX, y: newY };
      });

      // Update nodes ref for next frame
      nodesRef.current = updatedNodes;
      setNodes(updatedNodes);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length > 0]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl h-[80vh]">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">加载学生空间中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentFeedback = getFeedbackByStudent(student.id || '');
  const averageScore = examResults.length > 0 
    ? examResults.reduce((sum, exam) => sum + exam.total_score, 0) / examResults.length 
    : 0;
  const averageCorrectRate = examResults.length > 0
    ? examResults.reduce((sum, exam) => sum + (exam.correct_count / exam.total_questions), 0) / examResults.length * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{student.name} 的学习空间</CardTitle>
                <p className="text-muted-foreground">班级: {student.class}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Main View Area */}
            <div className="lg:col-span-2 relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {viewMode === 'graph' ? (
                <>
                  <canvas 
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-full"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge variant="secondary" className="bg-white/80 text-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      关系图视图
                    </Badge>
                    <button
                      onClick={() => setViewMode('tree')}
                      className="px-3 py-1 bg-white/80 hover:bg-white/90 rounded-full text-sm font-medium transition-colors"
                    >
                      <Trees className="w-3 h-3 mr-1 inline" />
                      松果视图
                    </button>
                  </div>
                </>
              ) : (
                <PineconeView 
                  student={student}
                  examResults={examResults}
                  scoringRecords={scoringRecords}
                  studentFeedback={getFeedbackByStudent(student.id || '')}
                  onSwitchView={() => setViewMode('graph')}
                />
              )}
            </div>

            {/* Statistics Panel */}
            <div className="border-l bg-muted/30 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Statistics Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    学习概况
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">平均分数</p>
                          <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                        </div>
                        <Target className="w-8 h-8 text-accent" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">正确率</p>
                          <p className="text-2xl font-bold">{averageCorrectRate.toFixed(1)}%</p>
                        </div>
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">反馈记录</p>
                          <p className="text-2xl font-bold">{studentFeedback.length}</p>
                        </div>
                        <MessageSquare className="w-8 h-8 text-secondary" />
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Recent Exams */}
                {examResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">最近考试</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {examResults.slice(0, 3).map(exam => (
                        <Card key={exam.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{exam.exam_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(exam.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={exam.total_score >= 80 ? "default" : exam.total_score >= 60 ? "secondary" : "destructive"}>
                              {exam.total_score.toFixed(1)}分
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Feedback */}
                {studentFeedback.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">最近反馈</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {studentFeedback.slice(0, 3).map(feedback => (
                        <Card key={feedback.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {feedback.feedback_date}
                              </p>
                              {feedback.notes && (
                                <p className="text-sm mt-1">{feedback.notes}</p>
                              )}
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                feedback.mood === 'happy' ? 'border-green-500 text-green-700' :
                                feedback.mood === 'neutral' ? 'border-yellow-500 text-yellow-700' :
                                feedback.mood === 'sad' ? 'border-red-500 text-red-700' :
                                'border-purple-500 text-purple-700'
                              }
                            >
                              {feedback.mood}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scoring Records */}
                {scoringRecords.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">评分记录</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {scoringRecords.slice(0, 3).map(record => (
                        <Card key={record.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{record.category}</p>
                              {record.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {record.score}分
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentSpace;