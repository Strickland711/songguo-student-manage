import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "@/components/StudentDashboard";
import TagsManagement from "@/components/TagsManagement";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Tag, MessageSquare, BarChart3 } from "lucide-react";

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">学生管理系统</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/feedback')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              反馈系统
            </Button>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              欢迎，{user.email}
            </p>
            <Button variant="outline" onClick={signOut}>
              退出登录
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-fit">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              学生管理
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              标签管理
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2" disabled>
              <BarChart3 className="w-4 h-4" />
              数据统计
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" disabled>
              <MessageSquare className="w-4 h-4" />
              系统设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentDashboard />
          </TabsContent>

          <TabsContent value="tags">
            <TagsManagement />
          </TabsContent>

          <TabsContent value="statistics">
            <div className="text-center py-12 text-muted-foreground">
              数据统计功能正在开发中...
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="text-center py-12 text-muted-foreground">
              系统设置功能正在开发中...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
