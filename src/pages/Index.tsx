import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import StudentDashboard from "@/components/StudentDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useUserRole();
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
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-primary">松果记</h1>
              <p className="text-sm text-muted-foreground">学生管理系统</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/intro')}>
                产品介绍
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  <Shield className="h-4 w-4 mr-1" />
                  管理员面板
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">
                  欢迎，{user.user_metadata?.full_name || user.email}
                </span>
              {isAdmin && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  管理员
                </Badge>
              )}
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <StudentDashboard />
      </main>
    </div>
  );
};

export default Index;
