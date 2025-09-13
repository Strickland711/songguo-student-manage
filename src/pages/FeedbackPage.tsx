import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import FeedbackSystem from "@/components/FeedbackSystemNew";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";

const FeedbackPage = () => {
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主界面
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">反馈系统</h1>
              <p className="text-muted-foreground mt-1">管理学生家长反馈情况</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              欢迎，{user.email}
            </p>
          </div>
        </div>
        
        <FeedbackSystem students={students} />
      </div>
    </div>
  );
};

export default FeedbackPage;