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

  // Create individual floating balls for each tag with collision detection
  useEffect(() => {
    if (loading) return;

    const studentFeedback = getFeedbackByStudent(student.id || '');
    const newNodes: FloatingNode[] = [];
    
    // Collect all tags/data points
    const allTags: Array<{
      id: string;
      title: string;
      content: string;
      color: string;
      type: 'info' | 'exam' | 'feedback' | 'tag';
    }> = [];

    // Student basic info
    allTags.push({
      id: 'student-info',
      title: student.name,
      content: `班级: ${student.class}`,
      color: 'hsl(217, 91%, 60%)', // Beautiful blue
      type: 'info'
    });

    // Exam results
    examResults.forEach((exam) => {
      allTags.push({
        id: `exam-${exam.id}`,
        title: exam.exam_name.length > 10 ? exam.exam_name.substring(0, 8) + '..' : exam.exam_name,
        content: `${exam.total_score.toFixed(1)}分`,
        color: exam.total_score >= 80 ? 'hsl(134, 61%, 50%)' :  // Fresh green
               exam.total_score >= 60 ? 'hsl(45, 93%, 58%)' :    // Warm amber
               'hsl(0, 72%, 51%)',                                // Soft red
        type: 'exam'
      });
    });

    // Feedback
    studentFeedback.forEach((feedback) => {
      const moodColors = {
        'happy': 'hsl(134, 61%, 50%)',    // Fresh green
        'neutral': 'hsl(45, 93%, 58%)',   // Warm amber
        'sad': 'hsl(0, 72%, 51%)'         // Soft red
      };
      
      allTags.push({
        id: `feedback-${feedback.id}`,
        title: '反馈',
        content: feedback.mood,
        color: moodColors[feedback.mood as keyof typeof moodColors] || 'hsl(220, 13%, 91%)',
        type: 'feedback'
      });
    });

    // Scoring records
    scoringRecords.forEach((record) => {
      allTags.push({
        id: `scoring-${record.id}`,
        title: record.category.length > 8 ? record.category.substring(0, 6) + '..' : record.category,
        content: `${record.score}분`,
        color: 'hsl(271, 81%, 56%)', // Beautiful purple
        type: 'tag'
      });
    });

    // Position balls with collision detection
    const canvasWidth = 800;
    const canvasHeight = 600;
    const minDistance = 120; // Minimum distance between ball centers

    allTags.forEach((tag, index) => {
      let x, y;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        x = 80 + Math.random() * (canvasWidth - 160);
        y = 80 + Math.random() * (canvasHeight - 160);
        attempts++;
        
        // Check collision with existing nodes
        const collision = newNodes.some(node => {
          const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
          return distance < minDistance;
        });
        
        if (!collision || attempts >= maxAttempts) break;
      } while (true);

      const size = tag.type === 'info' ? 90 : 70;
      
      newNodes.push({
        id: tag.id,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        type: tag.type,
        title: tag.title,
        content: tag.content,
        color: tag.color,
        size
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

      // No connections between nodes in this version

      // Update and draw nodes with slow consistent movement
      const updatedNodes = currentNodes.map((node, index) => {
        // Simple consistent movement - normalize velocity for fixed speed
        const currentSpeed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        const targetSpeed = 0.08; // Very slow fixed speed
        
        if (currentSpeed > 0) {
          node.vx = (node.vx / currentSpeed) * targetSpeed;
          node.vy = (node.vy / currentSpeed) * targetSpeed;
        }
        
        let newX = node.x + node.vx;
        let newY = node.y + node.vy;

        // Boundary collision with direction change
        if (newX < node.size / 2 || newX > canvas.width - node.size / 2) {
          node.vx *= -1;
          newX = Math.max(node.size / 2, Math.min(canvas.width - node.size / 2, newX));
        }
        if (newY < node.size / 2 || newY > canvas.height - node.size / 2) {
          node.vy *= -1;
          newY = Math.max(node.size / 2, Math.min(canvas.height - node.size / 2, newY));
        }

        // Simple collision detection - just bounce away
        currentNodes.forEach((otherNode, otherIndex) => {
          if (index !== otherIndex) {
            const dx = newX - otherNode.x;
            const dy = newY - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (node.size + otherNode.size) / 2 + 15;
            
            if (distance < minDistance && distance > 0) {
              // Simple bounce - reverse direction with slight randomness
              const bounceX = (dx / distance);
              const bounceY = (dy / distance);
              node.vx = bounceX * targetSpeed;
              node.vy = bounceY * targetSpeed;
              
              // Add tiny random component to prevent stuck situations
              node.vx += (Math.random() - 0.5) * 0.01;
              node.vy += (Math.random() - 0.5) * 0.01;
            }
          }
        });

        // Draw beautiful ball with elegant styling
        ctx.globalAlpha = 1;
        
        // Soft shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(newX + 2, newY + 2, node.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Main ball with subtle gradient
        const nodeGradient = ctx.createRadialGradient(
          newX - node.size * 0.1, newY - node.size * 0.1, 0,
          newX, newY, node.size / 2
        );
        nodeGradient.addColorStop(0, node.color);
        nodeGradient.addColorStop(1, node.color.replace(')', ', 0.85)'));
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(newX, newY, node.size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Subtle highlight
        const highlightGradient = ctx.createRadialGradient(
          newX - node.size * 0.15, newY - node.size * 0.15, 0,
          newX - node.size * 0.15, newY - node.size * 0.15, node.size * 0.25
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(newX - node.size * 0.15, newY - node.size * 0.15, node.size * 0.25, 0, 2 * Math.PI);
        ctx.fill();

        // Clean border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(newX, newY, node.size / 2, 0, 2 * Math.PI);
        ctx.stroke();

        // Beautiful text with enhanced typography
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title text
        const titleSize = Math.max(12, node.size / 6);
        ctx.font = `bold ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(node.title, newX, newY - 8);
        
        // Content text
        const contentSize = Math.max(10, node.size / 8);
        ctx.font = `${contentSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(node.content, newX, newY + 10);

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
              <canvas 
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full"
              />
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="bg-white/80 text-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  标签球视图
                </Badge>
              </div>
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