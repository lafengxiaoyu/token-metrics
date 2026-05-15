# TokenLens - 安装指南

GitHub Copilot CLI token 使用分析仪表板，包含高级洞察功能

## 功能特性

- 📊 Token 使用统计和成本分析
- 📈 模型使用趋势图表
- 🔍 会话详情和项目分析
- 🧠 AI 对话质量分析
- 🔐 安全审计（检测敏感信息泄露）
- ⚡ 编辑 vs 查看比率分析
- 🔤 编程语言分布统计
- ⏱️ 会话时长分析

## 安装方式

### 方式 1: 从 .tgz 文件安装（最快）

```bash
# 下载 mikeyxyz-tokenlens-0.2.0.tgz 文件后
npm install -g ./mikeyxyz-tokenlens-0.2.0.tgz
```

### 方式 2: 从 GitHub 安装

```bash
npm install -g github:mikeymiaoxyz/tokenlens
```

### 方式 3: 从 npm 安装（如已发布）

```bash
npm install -g @mikeyxyz/tokenlens
```

## 使用方法

安装后直接运行：

```bash
tokenlens
```

浏览器会自动打开 `http://localhost:3456`

## 系统要求

- Node.js >= 22
- 需要有 GitHub Copilot CLI 使用历史（数据位于 `~/.copilot/session-state/`）

## 功能亮点

### 📈 Development Habits（开发习惯分析）

1. **Edit vs View Ratio** - 了解你的编辑和查看代码的比例
2. **Language Distribution** - 查看你主要使用的编程语言
3. **Session Duration** - 分析工作会话时长模式

### 🔐 Advanced Insights（高级洞察）

- **Security Audit** - 检测对话中的敏感信息（API密钥、密码、邮箱等）
- **Reasoning Analysis** - 分析 AI 推理复杂度
- **Conversation Quality** - 评估对话质量和效率
- **Tool Efficiency** - 工具调用成功率统计

## 问题排查

如果遇到 "Cannot find module" 错误：
```bash
# 重新安装
npm uninstall -g @mikeyxyz/tokenlens
npm install -g ./mikeyxyz-tokenlens-0.2.0.tgz
```

如果端口被占用：
```bash
# 使用不同端口
PORT=3457 tokenlens
```

## 联系方式

如有问题，请联系项目维护者或提交 issue。
