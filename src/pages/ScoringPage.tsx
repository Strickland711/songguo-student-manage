import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import ScoringSystem from "@/components/ScoringSystem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";

const ScoringPage = () => {
  const { user, loading } = useAuth();
  const { students, loading: dataLoading } = useStudentData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回主界面
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-primary">登分系统</h1>
                <p className="text-sm text-muted-foreground">高效的考试评分和成绩管理</p>
              </div>
            </div>
            <span className="text-sm text-foreground">
              欢迎，{user.user_metadata?.full_name || user.email}
            </span>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <ScoringSystem students={students} />
      </main>
    </div>
  );
};

export default ScoringPage;
