import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Trees } from 'lucide-react';
import { Student } from '@/hooks/useStudentData';

interface PineconeData {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  sway: number;
  swayPhase: number;
  type: 'exam' | 'feedback' | 'scoring';
  title: string;
  content: string;
  color: string;
  details: string;
}

interface PineconeViewProps {
  student: Student;
  examResults: any[];
  scoringRecords: any[];
  studentFeedback: any[];
  onSwitchView: () => void;
}

const PineconeView = ({ 
  student, 
  examResults, 
  scoringRecords, 
  studentFeedback, 
  onSwitchView 
}: PineconeViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [pinecones, setPinecones] = useState<PineconeData[]>([]);
  const [selectedPinecone, setSelectedPinecone] = useState<PineconeData | null>(null);

  // Create pinecone data
  useEffect(() => {
    const newPinecones: PineconeData[] = [];
    
    // Branch positions - create 3 main branches
    const branches = [
      { startX: 100, endX: 700, y: 200, curve: -50 }, // Top branch
      { startX: 150, endX: 650, y: 350, curve: 30 },  // Middle branch  
      { startX: 200, endX: 600, y: 500, curve: -30 }   // Bottom branch
    ];

    let pineconeIndex = 0;

    // Add exam result pinecones
    examResults.slice(0, 8).forEach((exam, index) => {
      const branchIndex = index % branches.length;
      const branch = branches[branchIndex];
      const progress = (index % 3) / 2; // 0, 0.5, 1 positions on branch
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI);
      
      newPinecones.push({
        id: `exam-${exam.id}`,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 30,
        scale: 0.8 + Math.random() * 0.4,
        rotation: (Math.random() - 0.5) * 0.3,
        sway: (Math.random() - 0.5) * 2,
        swayPhase: Math.random() * Math.PI * 2,
        type: 'exam',
        title: exam.exam_name,
        content: `${exam.total_score.toFixed(1)}分`,
        color: exam.total_score >= 80 ? '#22c55e' : exam.total_score >= 60 ? '#eab308' : '#ef4444',
        details: `正确率: ${((exam.correct_count / exam.total_questions) * 100).toFixed(1)}%\n日期: ${new Date(exam.created_at).toLocaleDateString()}`
      });
      pineconeIndex++;
    });

    // Add feedback pinecones
    studentFeedback.slice(0, 6).forEach((feedback, index) => {
      const branchIndex = (index + 1) % branches.length;
      const branch = branches[branchIndex];
      const progress = ((index % 2) + 0.3) / 2;
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI);
      
      const moodColors = {
        'happy': '#22c55e',
        'neutral': '#eab308', 
        'sad': '#ef4444'
      };
      
      newPinecones.push({
        id: `feedback-${feedback.id}`,
        x: x + (Math.random() - 0.5) * 35,
        y: y + (Math.random() - 0.5) * 25,
        scale: 0.7 + Math.random() * 0.3,
        rotation: (Math.random() - 0.5) * 0.4,
        sway: (Math.random() - 0.5) * 1.5,
        swayPhase: Math.random() * Math.PI * 2,
        type: 'feedback',
        title: `反馈 ${feedback.feedback_date}`,
        content: feedback.mood,
        color: moodColors[feedback.mood as keyof typeof moodColors] || '#8b5cf6',
        details: feedback.notes || '无备注'
      });
    });

    // Add scoring record pinecones
    scoringRecords.slice(0, 6).forEach((record, index) => {
      const branchIndex = (index + 2) % branches.length;
      const branch = branches[branchIndex];
      const progress = ((index % 2) + 0.15) / 2;
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI);
      
      newPinecones.push({
        id: `scoring-${record.id}`,
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        scale: 0.6 + Math.random() * 0.3,
        rotation: (Math.random() - 0.5) * 0.5,
        sway: (Math.random() - 0.5) * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        type: 'scoring',
        title: record.category,
        content: `${record.score}分`,
        color: '#8b5cf6',
        details: record.notes || '无备注'
      });
    });

    setPinecones(newPinecones);
  }, [examResults, scoringRecords, studentFeedback]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || pinecones.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw tree branches
      const branches = [
        { startX: 100, endX: 700, y: 200, curve: -50 },
        { startX: 150, endX: 650, y: 350, curve: 30 },
        { startX: 200, endX: 600, y: 500, curve: -30 }
      ];

      branches.forEach(branch => {
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(branch.startX, branch.y);
        
        // Draw curved branch
        for (let t = 0; t <= 1; t += 0.1) {
          const x = branch.startX + (branch.endX - branch.startX) * t;
          const y = branch.y + branch.curve * Math.sin(t * Math.PI);
          if (t === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Draw smaller branch details
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) {
          const t = (i + 1) / 4;
          const x = branch.startX + (branch.endX - branch.startX) * t;
          const y = branch.y + branch.curve * Math.sin(t * Math.PI);
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // Draw pinecones
      pinecones.forEach(pinecone => {
        const swayOffset = Math.sin(time + pinecone.swayPhase) * pinecone.sway;
        const currentX = pinecone.x + swayOffset;
        const currentY = pinecone.y + Math.cos(time + pinecone.swayPhase) * 0.5;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(pinecone.rotation + swayOffset * 0.01);
        ctx.scale(pinecone.scale, pinecone.scale);

        // Draw pinecone body
        const size = 25;
        ctx.fillStyle = pinecone.color;
        
        // Pinecone shape
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.6, size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pinecone texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(0, -size + i * (size * 0.5), size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const title = pinecone.title.length > 6 ? pinecone.title.substring(0, 6) + '..' : pinecone.title;
        ctx.fillText(title, 0, -3);
        ctx.font = '7px sans-serif';
        ctx.fillText(pinecone.content, 0, 5);

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [pinecones]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is on any pinecone
    const clickedPinecone = pinecones.find(pinecone => {
      const distance = Math.sqrt((x - pinecone.x) ** 2 + (y - pinecone.y) ** 2);
      return distance < 30 * pinecone.scale;
    });

    setSelectedPinecone(clickedPinecone || null);
  };

  return (
    <div className="relative w-full h-full">
      <canvas 
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />
      
      <div className="absolute top-4 left-4 flex gap-2">
        <Badge variant="secondary" className="bg-white/80 text-foreground">
          <Trees className="w-3 h-3 mr-1" />
          松果视图
        </Badge>
        <button
          onClick={onSwitchView}
          className="px-3 py-1 bg-white/80 hover:bg-white/90 rounded-full text-sm font-medium transition-colors"
        >
          <Star className="w-3 h-3 mr-1 inline" />
          关系图视图
        </button>
      </div>

      <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-3 max-w-xs">
        <h4 className="font-semibold text-sm mb-2">{student.name} 的学习松果</h4>
        <p className="text-xs text-muted-foreground">点击松果查看详细信息</p>
      </div>

      {selectedPinecone && (
        <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">{selectedPinecone.title}</h4>
            <button 
              onClick={() => setSelectedPinecone(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <p className="text-sm font-medium mb-1">{selectedPinecone.content}</p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {selectedPinecone.details}
          </p>
          <Badge 
            variant="outline" 
            className="mt-2"
            style={{ borderColor: selectedPinecone.color, color: selectedPinecone.color }}
          >
            {selectedPinecone.type === 'exam' ? '考试' : 
             selectedPinecone.type === 'feedback' ? '反馈' : '评分'}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default PineconeView;