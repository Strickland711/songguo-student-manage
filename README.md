# 松果记-学生管理系统 📚

一个功能完整的教培学生管理系统，帮助教师高效管理学生、记录反馈、分析数据。

## ✨ 核心功能

### 1. 学生管理 👨‍🎓

**班级空间 (ClassSpace)**
- 可视化班级分组管理
- 拖拽式学生分配到不同班级
- 支持快速添加、编辑、删除学生
- 批量导入学生数据（Excel/CSV）
- 自定义学生字段（电话、家长姓名等）

**学生个人空间 (StudentSpace)**
- 查看学生详细信息和学习档案
- 历史反馈记录追踪
- 标签分类管理
- 成绩趋势分析

### 2. 反馈系统 💬

**反馈日历**
- 日历视图直观显示每日反馈活跃度
- 快速记录学生反馈情况（高兴/一般/沮丧）
- 支持批量操作，提升反馈效率
- 反馈备注支持富文本编辑
- 一键清空当日反馈

**反馈话术模板**
- 按班级/自定义字段配置话术模板
- 支持变量插入（{姓名}、{班级}等）
- 快速套用模板，节省沟通时间
- 模板可视化管理与编辑

**反馈计划**
- 周视图规划反馈任务
- 标记重点跟进学生
- 跟踪反馈完成进度
- 批量操作提升工作效率

### 3. 学员分层管理 📊

**智能分层**
- 根据反馈频次自动分层
- 自定义分层规则和阈值
- 可视化分层结果展示
- 支持手动调整分层

**数据分析**
- 各层级学员数量统计
- 反馈频次趋势分析
- 学员流动追踪
- 导出分层报告

### 4. 评分系统 ⭐

**多维度评分**
- 自定义评分类别
- 历史评分记录
- 分数趋势可视化
- 评分统计与分析

### 5. 标签系统 🏷️

**标签管理**
- 创建自定义标签（颜色、描述）
- 拖拽式标签分配
- 标签分组查看
- 批量标签操作

**标签生成器**
- AI辅助生成标签建议
- 基于学生特征自动打标签
- 标签模板库

### 6. 学生看板 📈

**数据可视化**
- 学生学习情况总览
- 反馈统计图表
- 成绩趋势分析
- 关键指标监控

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 bun
- Supabase账号（用于数据存储）

### 安装步骤

1. **克隆项目**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **安装依赖**
```bash
npm install
# 或
bun install
```

3. **配置环境变量**

项目已连接到Supabase，无需手动配置环境变量。

4. **启动开发服务器**
```bash
npm run dev
# 或
bun run dev
```

5. **访问应用**

打开浏览器访问 `http://localhost:8080`

## 📖 使用指南

### 首次使用

1. **注册/登录账号**
   - 访问 `/auth` 页面
   - 使用邮箱注册或登录

2. **添加学生信息**
   - 进入主界面，点击"学生管理"
   - 可以手动添加或批量导入学生
   - 设置学生的班级和自定义字段

3. **配置反馈模板**
   - 进入"反馈系统" → "反馈话术"
   - 创建不同场景的反馈模板
   - 使用变量让模板更灵活

### 日常使用流程

#### 每日反馈记录
1. 打开"反馈系统" → "反馈日历"
2. 选择今天的日期
3. 快速点击学生的表情按钮记录反馈
4. 添加详细备注（可使用话术模板）
5. 点击"保存所有反馈"批量提交

#### 学员分层管理
1. 进入"学员分层"模块
2. 系统自动根据反馈频次分层
3. 查看各层级学员列表
4. 制定针对性的跟进策略

#### 反馈计划制定
1. 进入"反馈计划"模块
2. 在周视图中规划本周反馈任务
3. 标记重点学生
4. 跟踪完成情况

### 高级功能

#### 自定义字段
- 在学生管理中添加自定义字段
- 记录家长电话、特殊备注等信息
- 在反馈模板中使用自定义字段变量

#### 数据导出
- 导出学生名单
- 导出反馈记录
- 生成统计报告

#### 标签系统
- 为学生打上特征标签
- 按标签筛选和分组
- 使用拖拽快速分配标签

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **状态管理**: React Hooks
- **后端服务**: Supabase
  - 数据库: PostgreSQL
  - 身份认证: Supabase Auth
  - 实时同步: Supabase Realtime
- **路由**: React Router v6
- **日期处理**: date-fns
- **表单验证**: React Hook Form + Zod
- **拖拽**: @dnd-kit
- **图表**: Recharts

## 📦 项目结构

```
src/
├── components/          # 组件目录
│   ├── ui/             # UI基础组件
│   ├── ClassSpace.tsx  # 班级管理
│   ├── StudentSpace.tsx # 学生空间
│   ├── FeedbackSystemNew.tsx # 反馈系统
│   ├── FeedbackTemplateManager.tsx # 话术模板
│   ├── StudentSegmentation.tsx # 学员分层
│   ├── ScoringSystem.tsx # 评分系统
│   └── ...
├── hooks/              # 自定义Hooks
│   ├── useAuth.tsx    # 认证Hook
│   ├── useFeedbackData.ts # 反馈数据Hook
│   ├── useStudentData.ts # 学生数据Hook
│   └── useFeedbackTemplates.ts # 模板Hook
├── pages/              # 页面组件
│   ├── Index.tsx      # 首页
│   ├── FeedbackPage.tsx # 反馈页面
│   ├── Auth.tsx       # 认证页面
│   └── ...
├── integrations/       # 集成服务
│   └── supabase/      # Supabase配置
└── lib/               # 工具函数

supabase/
├── migrations/        # 数据库迁移文件
└── config.toml       # Supabase配置
```

## 🎨 数据库设计

主要数据表：
- `students` - 学生信息表
- `custom_fields` - 自定义字段定义
- `student_field_values` - 学生自定义字段值
- `feedback_records` - 反馈记录表
- `feedback_templates` - 反馈话术模板
- `scoring_records` - 评分记录
- `tags` - 标签表
- `student_tags` - 学生标签关联
- `classroom_sessions` - 课堂会话
- `attendance_records` - 考勤记录
- `exams` - 考试表
- `exam_results` - 考试成绩

所有表均配置了行级安全策略（RLS），确保数据安全。

## 🔐 安全特性

- 基于Supabase的身份认证
- 行级安全策略（RLS）保护数据
- 用户只能访问自己创建的数据
- 敏感操作需要权限验证

## 🎯 最佳实践

1. **定期记录反馈**
   - 建议每天固定时间记录学生反馈
   - 使用批量操作提高效率

2. **合理使用模板**
   - 为常见场景创建模板
   - 根据学生特征个性化调整

3. **关注学员分层**
   - 定期查看分层变化
   - 对重点关注学员加强跟进

4. **数据备份**
   - 定期导出重要数据
   - Supabase自动备份数据库

## 🚢 部署

### Lovable平台部署
1. 打开 [Lovable项目](https://lovable.dev/projects/399fb9ac-8bad-4102-96a1-15f7bc3a4d56)
2. 点击右上角 "Publish" 按钮
3. 系统自动部署，获得在线访问链接

### 自定义域名
1. 进入 Project > Settings > Domains
2. 点击 "Connect Domain"
3. 按提示配置DNS记录
4. 等待域名验证完成

### 自托管部署
```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
# 可部署到任何静态托管服务
```

支持的托管平台：
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

## 📝 开发指南

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 构建
npm run build

# 预览构建结果
npm run preview
```

### 代码编辑

**在Lovable中编辑**
- 访问项目页面，直接使用AI编程
- 自动提交到Git仓库

**使用IDE编辑**
- 克隆仓库到本地
- 使用VS Code等IDE编辑
- 提交更改会自动同步到Lovable

**GitHub Codespaces**
- 点击 "Code" → "Codespaces" → "New codespace"
- 在线编辑和调试

## 🐛 故障排查

### 常见问题

**无法登录**
- 检查Supabase配置是否正确
- 确认邮箱是否已验证

**数据不显示**
- 检查网络连接
- 查看浏览器控制台错误
- 确认RLS策略配置

**反馈保存失败**
- 检查是否已登录
- 确认学生数据存在
- 查看网络请求错误

### 获取帮助

- 查看 [Lovable文档](https://docs.lovable.dev/)
- 加入 [Discord社区](https://discord.com/channels/1119885301872070706/1280461670979993613)
- 查看 [Supabase文档](https://supabase.com/docs)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 在GitHub上提交Issue
- Lovable项目页面留言

---

**项目地址**: [Lovable Project](https://lovable.dev/projects/399fb9ac-8bad-4102-96a1-15f7bc3a4d56)

**最后更新**: 2025-01-05
