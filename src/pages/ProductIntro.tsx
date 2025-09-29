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
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastScrollTime = useRef(0);

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

  // Handle wheel scroll for page navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 1000) return; // Debounce 1 second
      
      if (isScrollingRef.current) return;
      
      const delta = e.deltaY;
      
      if (delta > 0 && currentSection < sections.length - 1) {
        // Scroll down
        lastScrollTime.current = now;
        scrollToSection(currentSection + 1);
      } else if (delta < 0 && currentSection > 0) {
        // Scroll up
        lastScrollTime.current = now;
        scrollToSection(currentSection - 1);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [currentSection, sections.length]);

  // Handle scroll navigation
  const scrollToSection = (index: number) => {
    if (sectionsRef.current[index] && !isScrollingRef.current) {
      isScrollingRef.current = true;
      setCurrentSection(index);
      sectionsRef.current[index].scrollIntoView({ behavior: 'smooth' });
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden h-screen">
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
        className="absolute inset-0 flex items-center justify-center bg-gradient-hero overflow-hidden transition-opacity duration-700"
        style={{ 
          opacity: currentSection === 0 ? 1 : 0,
          pointerEvents: currentSection === 0 ? 'auto' : 'none',
          zIndex: currentSection === 0 ? 10 : 0
        }}
      >
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="container mx-auto text-center relative z-10 px-4 max-w-6xl">
          <div className="animate-fade-in-down">
            <Badge className="mb-4 text-base px-5 py-2 bg-primary text-primary-foreground shadow-elegant">
              <Star className="w-4 h-4 mr-2" />
              专业教培管理系统
            </Badge>
          </div>
          
          <h1 className="text-7xl md:text-8xl font-black mb-6 text-foreground animate-scale-in font-serif tracking-wider">
            松果记
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto animate-fade-in-up font-light tracking-wide">
            新一代智能学生管理系统<br />让教育管理更简单、更高效、更智能
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10 animate-bounce-in">
            <Button 
              size="lg" 
              className="text-lg px-8 py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/auth')}
            >
              <Zap className="w-5 h-5 mr-2" />
              立即体验
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-5 border-foreground/20 text-foreground hover:bg-card shadow-elegant transform hover:scale-105 transition-all duration-300"
            >
              <Play className="w-5 h-5 mr-2" />
              观看演示
            </Button>
          </div>

          <button 
            onClick={() => scrollToSection(1)}
            className="animate-bounce text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[1] = el)} 
        className="absolute inset-0 flex items-center py-12 bg-background overflow-hidden transition-opacity duration-700"
        style={{ 
          opacity: currentSection === 1 ? 1 : 0,
          pointerEvents: currentSection === 1 ? 'auto' : 'none',
          zIndex: currentSection === 1 ? 10 : 0
        }}
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12 animate-fade-in-down">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-serif">
              核心功能特色
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto font-light">
              五大核心模块，全面覆盖教育管理需求
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className={`group cursor-pointer bg-gradient-card border-border/50 hover:border-primary/50 shadow-card hover:shadow-elegant transform hover:scale-105 transition-all duration-500 animate-fade-in-up h-full`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-grow">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[2] = el)} 
        className="absolute inset-0 flex items-center py-12 bg-gradient-subtle overflow-hidden transition-opacity duration-700"
        style={{ 
          opacity: currentSection === 2 ? 1 : 0,
          pointerEvents: currentSection === 2 ? 'auto' : 'none',
          zIndex: currentSection === 2 ? 10 : 0
        }}
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12 animate-fade-in-down">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-serif">
              为什么选择松果记？
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              数据驱动的教育管理解决方案
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className={`text-center group bg-card border-border/50 hover:border-accent/50 shadow-card hover:shadow-elegant transform hover:scale-105 transition-all duration-500 animate-slide-in-${index % 2 === 0 ? 'left' : 'right'}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <CardContent className="p-6">
                  <benefit.icon className="w-10 h-10 mx-auto mb-3 text-accent group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-3xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                    {benefit.value}
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[3] = el)} 
        className="absolute inset-0 flex items-center py-12 bg-background overflow-hidden transition-opacity duration-700"
        style={{ 
          opacity: currentSection === 3 ? 1 : 0,
          pointerEvents: currentSection === 3 ? 'auto' : 'none',
          zIndex: currentSection === 3 ? 10 : 0
        }}
      >
        <div className="container mx-auto px-4 text-center max-w-6xl">
          <div className="mb-12 animate-fade-in-down">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-serif">
              用数据说话
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              已服务数万教育工作者，获得一致好评
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="animate-bounce-in" style={{ animationDelay: '0s' }}>
              <div className="text-5xl md:text-6xl font-bold text-primary mb-3">10,000+</div>
              <p className="text-lg text-muted-foreground">活跃用户</p>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl md:text-6xl font-bold text-accent mb-3">99.9%</div>
              <p className="text-lg text-muted-foreground">系统稳定性</p>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: '0.4s' }}>
              <div className="text-5xl md:text-6xl font-bold text-success mb-3">24/7</div>
              <p className="text-lg text-muted-foreground">技术支持</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={(el: HTMLDivElement | null) => el && (sectionsRef.current[4] = el)} 
        className="absolute inset-0 flex items-center bg-gradient-primary text-primary-foreground overflow-hidden transition-opacity duration-700"
        style={{ 
          opacity: currentSection === 4 ? 1 : 0,
          pointerEvents: currentSection === 4 ? 'auto' : 'none',
          zIndex: currentSection === 4 ? 10 : 0
        }}
      >
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="container mx-auto text-center relative z-10 px-4 max-w-5xl">
          <div className="animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 font-serif">
              准备开始您的智能教育管理之旅？
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto font-light">
              加入数万教育工作者的行列，体验更高效、更智能的教学管理
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-5 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elegant transform hover:scale-105 transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
                <Zap className="w-5 h-5 mr-2" />
                立即免费试用
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-6 text-primary-foreground/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>免费试用</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>无需信用卡</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>专业支持</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="absolute bottom-0 left-0 right-0 py-6 px-4 bg-card/50 backdrop-blur-sm border-t border-border z-20"
        style={{ 
          opacity: currentSection === 4 ? 0 : 0.9
        }}
      >
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 松果记. 保留所有权利.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProductIntro;