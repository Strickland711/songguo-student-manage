import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  MessageSquare, 
  FileSpreadsheet, 
  Target,
  Star,
  Trophy,
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

const ProductIntro = () => {
  const navigate = useNavigate();
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: Users,
      title: "智能学生管理",
      description: "全方位管理学生信息，支持班级分组、标签分类，让管理更有序",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "精准评分系统",
      description: "多维度评分机制，实时记录学生表现，量化学习成果",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageSquare,
      title: "智能反馈分析",
      description: "AI驱动的情感分析，深度理解学生反馈，优化教学策略",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "数据可视化",
      description: "直观的图表展示，学习趋势一目了然，决策更科学",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: FileSpreadsheet,
      title: "一键导出",
      description: "灵活的数据导出功能，支持多种格式，报告制作更便捷",
      color: "from-indigo-500 to-blue-500"
    }
  ];

  const benefits = [
    "提升教学效率 50%",
    "减少管理时间 70%",
    "增强学生参与度",
    "数据驱动决策"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 animate-pulse"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="animate-fade-in">
            <Badge className="mb-4 text-lg px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white">
              <Star className="w-4 h-4 mr-2" />
              专业教培管理系统
            </Badge>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-scale-in">
              松果记
            </h1>
            <p className="text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in delay-300">
              新一代智能学生管理系统，让教育管理更简单、更高效、更智能
            </p>
            <div className="flex justify-center gap-4 animate-fade-in delay-500">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 bg-gradient-to-r from-primary to-secondary hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
                立即体验
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                观看演示
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              核心功能特色
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              五大核心模块，全面覆盖教育管理需求
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Feature Cards */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all duration-500 transform hover:scale-105 ${
                    currentFeature === index 
                      ? 'ring-2 ring-primary shadow-2xl bg-gradient-to-r from-background to-primary/5' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setCurrentFeature(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.color} text-white`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feature Visualization */}
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 h-96 flex items-center justify-center">
                <div className={`text-center animate-scale-in bg-gradient-to-r ${features[currentFeature].color} bg-clip-text text-transparent`}>
                  {(() => {
                    const IconComponent = features[currentFeature].icon;
                    return <IconComponent className="w-32 h-32 mx-auto mb-4 animate-pulse" />;
                  })()}
                  <h3 className="text-2xl font-bold">{features[currentFeature].title}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto">
            <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              为什么选择松果记？
            </h2>
            <p className="text-xl text-muted-foreground">
              数据驱动的教育管理解决方案
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in">
                <CardContent className="p-4">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-primary animate-bounce" />
                  <h3 className="text-lg font-semibold">{benefit}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-5xl font-bold text-primary mb-2">10,000+</div>
              <p className="text-muted-foreground">活跃用户</p>
            </div>
            <div className="animate-fade-in delay-300">
              <div className="text-5xl font-bold text-secondary mb-2">99.9%</div>
              <p className="text-muted-foreground">系统稳定性</p>
            </div>
            <div className="animate-fade-in delay-500">
              <div className="text-5xl font-bold text-accent mb-2">24/7</div>
              <p className="text-muted-foreground">技术支持</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">准备开始您的智能教育管理之旅？</h2>
            <p className="text-xl mb-8 opacity-90">
              加入数万教育工作者的行列，体验更高效的教学管理
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-4 bg-white text-primary hover:bg-gray-100 transform hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
                <Zap className="w-5 h-5 mr-2" />
                立即免费试用
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            松果记
          </h3>
          <p className="text-slate-400 mb-4">专业教培小帮手，让教育管理更简单</p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <span>© 2024 松果记. 保留所有权利.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductIntro;