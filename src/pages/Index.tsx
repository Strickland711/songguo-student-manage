import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "@/components/StudentDashboard";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
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
        <div className="flex justify-end items-center mb-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              欢迎，{user.email}
            </p>
            <Button variant="outline" onClick={signOut}>
              退出登录
            </Button>
          </div>
        </div>
        
        <StudentDashboard />
      </div>
    </div>
  );
};

export default Index;
