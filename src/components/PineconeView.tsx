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

  // Create static pinecone data positioned on tree branches
  useEffect(() => {
    const newPinecones: PineconeData[] = [];
    
    // Define tree structure with more realistic branch positions
    const mainBranches = [
      { startX: 120, endX: 680, y: 180, curve: -40, thickness: 12 }, // Top branch
      { startX: 140, endX: 660, y: 300, curve: 25, thickness: 14 },  // Middle branch  
      { startX: 160, endX: 640, y: 420, curve: -35, thickness: 10 }, // Lower branch
      { startX: 180, endX: 620, y: 520, curve: 20, thickness: 8 }    // Bottom branch
    ];

    // Create fixed positions for pinecones along branches
    const positionsPerBranch = [
      [0.2, 0.4, 0.6, 0.8], // Top branch positions
      [0.15, 0.35, 0.55, 0.75, 0.9], // Middle branch positions
      [0.25, 0.5, 0.75], // Lower branch positions
      [0.3, 0.7] // Bottom branch positions
    ];

    let dataIndex = 0;

    // Add exam result pinecones to top and middle branches
    examResults.slice(0, 6).forEach((exam, index) => {
      const branchIndex = index < 3 ? 0 : 1; // Top or middle branch
      const branch = mainBranches[branchIndex];
      const positions = positionsPerBranch[branchIndex];
      const posIndex = index % positions.length;
      const progress = positions[posIndex];
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI) - 15; // Hang below branch
      
      newPinecones.push({
        id: `exam-${exam.id}`,
        x: x,
        y: y,
        scale: 0.9,
        rotation: 0,
        sway: 0,
        swayPhase: 0,
        type: 'exam',
        title: exam.exam_name,
        content: `${exam.total_score.toFixed(1)}分`,
        color: exam.total_score >= 80 ? 'hsl(142 71% 45%)' : exam.total_score >= 60 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)',
        details: `正确率: ${((exam.correct_count / exam.total_questions) * 100).toFixed(1)}%\n日期: ${new Date(exam.created_at).toLocaleDateString()}`
      });
    });

    // Add feedback pinecones to middle and lower branches
    studentFeedback.slice(0, 5).forEach((feedback, index) => {
      const branchIndex = index < 3 ? 1 : 2; // Middle or lower branch
      const branch = mainBranches[branchIndex];
      const positions = positionsPerBranch[branchIndex];
      const posIndex = index % positions.length;
      const progress = positions[posIndex];
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI) - 12;
      
      const moodColors = {
        'happy': 'hsl(142 71% 45%)',
        'neutral': 'hsl(38 92% 50%)', 
        'sad': 'hsl(0 84% 60%)'
      };
      
      newPinecones.push({
        id: `feedback-${feedback.id}`,
        x: x,
        y: y,
        scale: 0.8,
        rotation: 0,
        sway: 0,
        swayPhase: 0,
        type: 'feedback',
        title: '反馈',
        content: feedback.mood,
        color: moodColors[feedback.mood as keyof typeof moodColors] || 'hsl(262 83% 58%)',
        details: feedback.notes || '无备注'
      });
    });

    // Add scoring record pinecones to lower and bottom branches
    scoringRecords.slice(0, 4).forEach((record, index) => {
      const branchIndex = index < 2 ? 2 : 3; // Lower or bottom branch
      const branch = mainBranches[branchIndex];
      const positions = positionsPerBranch[branchIndex];
      const posIndex = index % positions.length;
      const progress = positions[posIndex];
      
      const x = branch.startX + (branch.endX - branch.startX) * progress;
      const y = branch.y + branch.curve * Math.sin(progress * Math.PI) - 10;
      
      newPinecones.push({
        id: `scoring-${record.id}`,
        x: x,
        y: y,
        scale: 0.7,
        rotation: 0,
        sway: 0,
        swayPhase: 0,
        type: 'scoring',
        title: record.category,
        content: `${record.score}分`,
        color: 'hsl(262 83% 58%)',
        details: record.notes || '无备注'
      });
    });

    setPinecones(newPinecones);
  }, [examResults, scoringRecords, studentFeedback]);

  // Static tree rendering - no animation for pinecones
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawTree = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw beautiful gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, 'hsl(210 40% 96%)');
      bgGradient.addColorStop(1, 'hsl(210 40% 92%)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw main tree trunk
      const trunkGradient = ctx.createLinearGradient(380, 600, 420, 600);
      trunkGradient.addColorStop(0, 'hsl(30 30% 25%)');
      trunkGradient.addColorStop(1, 'hsl(30 30% 35%)');
      
      ctx.fillStyle = trunkGradient;
      ctx.fillRect(385, 520, 30, 80);

      // Draw tree branches with more realistic structure
      const mainBranches = [
        { startX: 120, endX: 680, y: 180, curve: -40, thickness: 12 },
        { startX: 140, endX: 660, y: 300, curve: 25, thickness: 14 },
        { startX: 160, endX: 640, y: 420, curve: -35, thickness: 10 },
        { startX: 180, endX: 620, y: 520, curve: 20, thickness: 8 }
      ];

      mainBranches.forEach((branch, index) => {
        // Branch gradient
        const branchGradient = ctx.createLinearGradient(branch.startX, branch.y, branch.endX, branch.y);
        branchGradient.addColorStop(0, 'hsl(30 40% 30%)');
        branchGradient.addColorStop(0.5, 'hsl(30 45% 40%)');
        branchGradient.addColorStop(1, 'hsl(30 40% 35%)');
        
        ctx.strokeStyle = branchGradient;
        ctx.lineWidth = branch.thickness;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        
        // Draw main curved branch
        for (let t = 0; t <= 1; t += 0.02) {
          const x = branch.startX + (branch.endX - branch.startX) * t;
          const y = branch.y + branch.curve * Math.sin(t * Math.PI);
          if (t === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Add branch texture with smaller twigs
        ctx.lineWidth = Math.max(2, branch.thickness * 0.3);
        ctx.globalAlpha = 0.8;
        
        for (let i = 0; i < 5; i++) {
          const t = (i + 1) / 6;
          const x = branch.startX + (branch.endX - branch.startX) * t;
          const y = branch.y + branch.curve * Math.sin(t * Math.PI);
          
          // Small upward twig
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 20, y - 15 - Math.random() * 10);
          ctx.stroke();
          
          // Small downward twig
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 15, y + 8 + Math.random() * 8);
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
      });

      // Connect branches to trunk
      ctx.strokeStyle = 'hsl(30 40% 32%)';
      ctx.lineWidth = 8;
      
      mainBranches.forEach(branch => {
        ctx.beginPath();
        ctx.moveTo(400, branch.y);
        ctx.lineTo(branch.startX, branch.y);
        ctx.stroke();
      });

      // Draw static pinecones
      pinecones.forEach(pinecone => {
        ctx.save();
        ctx.translate(pinecone.x, pinecone.y);
        ctx.scale(pinecone.scale, pinecone.scale);

        // Draw hanging string
        ctx.strokeStyle = 'hsl(30 30% 40%)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, -5);
        ctx.stroke();

        // Draw pinecone shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.ellipse(2, 2, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw pinecone body with gradient
        const pineconeGradient = ctx.createRadialGradient(-5, -8, 0, 0, 0, 20);
        pineconeGradient.addColorStop(0, pinecone.color);
        pineconeGradient.addColorStop(1, pinecone.color.replace(')', ' / 0.8)'));
        
        ctx.fillStyle = pineconeGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pinecone scales texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(0, -15 + i * 6, 12, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-3, -8, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Text with better readability
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const title = pinecone.title.length > 8 ? pinecone.title.substring(0, 6) + '..' : pinecone.title;
        ctx.strokeText(title, 0, -2);
        ctx.fillText(title, 0, -2);
        
        ctx.font = '8px system-ui';
        ctx.strokeText(pinecone.content, 0, 8);
        ctx.fillText(pinecone.content, 0, 8);

        ctx.restore();
      });
    };

    drawTree();
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