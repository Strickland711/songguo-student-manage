import { useState, useEffect, useRef } from 'react';
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
  CheckCircle,
  ArrowDown,
  Play,
  Shield,
  Clock,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

const ProductIntro = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(0);
  const sectionsRef = useRef<HTMLDivElement[]>([]);

  const sections = [
    { id: 'hero', title: '松果记' },
    { id: 'features', title: '核心功能' },
    { id: 'benefits', title: '产品优势' },
    { id: 'stats', title: '数据表现' },
    { id: 'cta', title: '立即体验' }
  ];

  const features = [
    {
      icon: Users,
      title: "智能学生管理",
      description: "全方位管理学生信息，支持班级分组、标签分类，让管理更有序",
      color: "text-primary"
    },
    {
      icon: Target,
      title: "精准评分系统",
      description: "多维度评分机制，实时记录学生表现，量化学习成果",
      color: "text-accent"
    },
    {
      icon: MessageSquare,
      title: "智能反馈分析",
      description: "AI驱动的情感分析，深度理解学生反馈，优化教学策略",
      color: "text-success"
    },
    {
      icon: BarChart3,
      title: "数据可视化",
      description: "直观的图表展示，学习趋势一目了然，决策更科学",
      color: "text-warning"
    },
    {
      icon: FileSpreadsheet,
      title: "一键导出",
      description: "灵活的数据导出功能，支持多种格式，报告制作更便捷",
      color: "text-primary"
    }
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "提升教学效率",
      value: "50%",
      description: "智能化管理大幅提升工作效率"
    },
    {
      icon: Clock,
      title: "减少管理时间",
      value: "70%",
      description: "自动化流程节省大量时间成本"
    },
    {
      icon: Shield,
      title: "增强学生参与度",
      value: "85%",
      description: "互动式管理激发学生积极性"
    },
    {
      icon: Sparkles,
      title: "数据驱动决策",
      value: "95%",
      description: "精准数据支撑科学决策"
    }
  ];

  // Handle scroll navigation
  const scrollToSection = (index: number) => {
    if (sectionsRef.current[index]) {
      sectionsRef.current[index].scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Intersection Observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionsRef.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) {
              setCurrentSection(index);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* Navigation Dots */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-3">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSection(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSection === index 
                ? 'bg-primary scale-150' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
            }`}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[0] = el)} 
        className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="container mx-auto text-center relative z-10 px-4">
          <div className="animate-fade-in-down">
            <Badge className="mb-6 text-lg px-6 py-3 bg-primary text-primary-foreground shadow-elegant">
              <Star className="w-5 h-5 mr-3" />
              专业教培管理系统
            </Badge>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-bold mb-8 text-foreground animate-scale-in">
            松果记
          </h1>
          
          <p className="text-2xl md:text-3xl text-muted-foreground mb-12 max-w-4xl mx-auto animate-fade-in-up">
            新一代智能学生管理系统<br />让教育管理更简单、更高效、更智能
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16 animate-bounce-in">
            <Button 
              size="lg" 
              className="text-xl px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/auth')}
            >
              <Zap className="w-6 h-6 mr-3" />
              立即体验
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-xl px-10 py-6 border-foreground/20 text-foreground hover:bg-card shadow-elegant transform hover:scale-105 transition-all duration-300"
            >
              <Play className="w-6 h-6 mr-3" />
              观看演示
            </Button>
          </div>

          <button 
            onClick={() => scrollToSection(1)}
            className="animate-bounce text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowDown className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[1] = el)} 
        className="min-h-screen flex items-center py-20 bg-background"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-20 animate-fade-in-down">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              核心功能特色
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              五大核心模块，全面覆盖教育管理需求，为您提供专业的解决方案
            </p>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={`group cursor-pointer bg-gradient-card border-border/50 hover:border-primary/50 shadow-card hover:shadow-elegant transform hover:scale-105 transition-all duration-500 animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-8">
                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[2] = el)} 
        className="min-h-screen flex items-center py-20 bg-gradient-subtle"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-20 animate-fade-in-down">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              为什么选择松果记？
            </h2>
            <p className="text-xl text-muted-foreground">
              数据驱动的教育管理解决方案，让每个数字都有意义
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className={`text-center group bg-card border-border/50 hover:border-accent/50 shadow-card hover:shadow-elegant transform hover:scale-105 transition-all duration-500 animate-slide-in-${index % 2 === 0 ? 'left' : 'right'}`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <CardContent className="p-8">
                  <div className="mb-6">
                    <benefit.icon className="w-12 h-12 mx-auto mb-4 text-accent group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-4xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                      {benefit.value}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[3] = el)} 
        className="min-h-screen flex items-center py-20 bg-background"
      >
        <div className="container mx-auto px-4 text-center">
          <div className="mb-20 animate-fade-in-down">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              用数据说话
            </h2>
            <p className="text-xl text-muted-foreground">
              已服务数万教育工作者，获得一致好评
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            <div className="animate-bounce-in" style={{ animationDelay: '0s' }}>
              <div className="text-6xl md:text-7xl font-bold text-primary mb-4">10,000+</div>
              <p className="text-xl text-muted-foreground">活跃用户</p>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-6xl md:text-7xl font-bold text-accent mb-4">99.9%</div>
              <p className="text-xl text-muted-foreground">系统稳定性</p>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: '0.4s' }}>
              <div className="text-6xl md:text-7xl font-bold text-success mb-4">24/7</div>
              <p className="text-xl text-muted-foreground">技术支持</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[4] = el)} 
        className="min-h-screen flex items-center bg-gradient-primary text-primary-foreground relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="container mx-auto text-center relative z-10 px-4">
          <div className="animate-fade-in-up">
            <h2 className="text-5xl md:text-6xl font-bold mb-8">
              准备开始您的智能教育管理之旅？
            </h2>
            <p className="text-2xl mb-12 opacity-90 max-w-3xl mx-auto">
              加入数万教育工作者的行列，体验更高效、更智能的教学管理
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-xl px-10 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elegant transform hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
                <Zap className="w-6 h-6 mr-3" />
                立即免费试用
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-8 text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>免费试用</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>无需信用卡</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>专业支持</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-card border-t border-border">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4 text-foreground">
            松果记
          </h3>
          <p className="text-muted-foreground mb-6">专业教培小帮手，让教育管理更简单</p>
          <div className="text-sm text-muted-foreground">
            © 2024 松果记. 保留所有权利.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductIntro;