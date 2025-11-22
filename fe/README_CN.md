# Hubble AI Trading Frontend

[🇨🇳 中文](README_CN.md) | [🇺🇸 English](README.md)

> **AI 驱动交易管理的前端开源系统**

## 项目描述

Hubble AI Trading Frontend 是一个生产就绪的全栈开源平台，专门为管理 AI 驱动的算法交易系统而设计。基于现代边缘计算基础设施构建，该系统为同时运行的多个 AI 交易代理提供全面的实时监控、分析和管理能力。

该平台作为集中式指挥中心，用户可以追踪多个 AI 交易员的性能表现，通过交互式可视化实时监控账户余额，管理交易订单的完整生命周期（从创建到执行或取消），分析具有历史背景的持仓记录，并存储来自不同团队角色的 AI 生成的交易分析。系统架构设计用于处理高频更新，具有实时余额轮询、适应选定交易员的交互式图表可视化以及智能订单筛选系统等功能。

这个项目的独特之处在于其完全边缘原生的架构——所有内容都在 Cloudflare 的全球网络上运行，确保全球范围内低于 50 毫秒的响应时间。整个技术栈，从数据库查询到 API 响应再到静态资源交付，都在边缘完成，使其非常适合对时间敏感的交易操作，在这些场景中延迟直接影响盈利能力。系统使用基于功能的模块化架构，确保业务逻辑和路由之间的清晰分离，使其高度可维护和可扩展，便于添加新的交易功能或集成额外的 AI 交易策略。

## 技术实现

该项目使用尖端的边缘计算技术栈，利用 Cloudflare 的基础设施实现全球性能。前端使用 React Router 7（支持服务端渲染 SSR）、React 19（并发特性）和 TailwindCSS 4 进行样式设计。整个应用程序作为单个 Cloudflare Worker 部署，使用 React Router 的边缘运行时，这意味着同一个代码库可以无缝处理服务端渲染和客户端水合。

后端架构特别有趣——不是传统的服务器基础设施，所有内容都在 Cloudflare Workers（边缘运行时）上运行，使用 Cloudflare D1（SQLite）作为数据库。这创建了一个零冷启动架构，数据库查询在边缘执行，靠近全球用户。数据库层使用 Drizzle ORM 和 SQLite 方言，提供类型安全的查询和迁移。会话管理通过 Cloudflare KV（键值存储）处理，为身份验证提供亚毫秒级的读写时间。

基础设施通过 Alchemy（一个 TypeScript 原生基础设施即代码框架）进行管理。`alchemy.run.ts` 文件声明式地定义所有资源（D1 数据库、KV 命名空间、Worker 绑定），部署是单个命令，处理资源创建、更新和清理。这消除了对 `wrangler.toml` 等单独配置文件的需求——一切都是类型安全且版本控制的。

一个特别巧妙的架构决策是基于功能的模块组织。每个业务领域（交易员、订单、持仓、分析团队）都是自包含的，拥有自己的数据库模式、API 处理程序、React Query hooks 和 UI 组件。这创建了清晰的边界，使代码库高度可维护。路由（处理 HTTP 关注点）和功能（包含业务逻辑）之间的分离确保业务逻辑可以在不同端点之间重用，而不会产生耦合。

实时图表可视化使用基于 Recharts 构建的自定义 SVG 渲染系统，具有智能 Y 轴缩放功能，当用户选择单个交易员时会自动调整。余额更新的轮询机制使用 React Query 的内置轮询和去重功能，确保高效的数据获取，而不会使边缘数据库过载。类型安全在整个过程中通过 TypeScript 强制执行，使用 Zod 模式进行运行时验证，并使用 Drizzle-Zod 集成进行数据库模式验证。

## 🚀 技术栈

- **前端**: React Router 7, React 19, TailwindCSS 4
- **后端**: Cloudflare Workers (边缘运行时)
- **数据库**: Cloudflare D1 (SQLite) + Drizzle ORM
- **基础设施**: Alchemy (基础设施即代码)
- **状态管理**: TanStack Query (React Query)
- **UI 组件**: Radix UI, Lucide Icons
- **数据可视化**: Recharts
- **语言**: TypeScript

## 📁 项目结构

```
trading/
├── app/                          # 应用源代码
│   ├── features/                 # 功能模块化目录
│   │   ├── traders/              # 交易员管理
│   │   ├── order/                # 订单管理
│   │   ├── positions/            # 持仓追踪
│   │   ├── analysis-team/        # 分析团队记录
│   │   ├── client.chart/         # 账户余额图表可视化
│   │   ├── client.order/         # 订单列表 UI
│   │   └── client.portfolio/     # 投资组合展示
│   ├── routes/                   # React Router 路由
│   │   └── api/v1/               # RESTful API 端点
│   ├── components/ui/            # 可复用 UI 组件
│   ├── lib/                      # 共享工具函数
│   └── middleware/               # 请求中间件
├── database/                      # 数据库 Schema 定义
├── drizzle/                      # 数据库迁移文件
├── workers/                      # Cloudflare Worker 入口
├── alchemy.run.ts                # 基础设施定义
└── package.json
```

## 🏗️ 架构设计

### 功能模块化组织

项目采用功能模块化架构，每个模块自包含：

```
app/features/{feature-name}/
├── database/          # 数据库 Schema 和类型定义
├── api/               # API 处理函数（仅服务端）
├── hooks/             # React Query hooks（客户端）
├── components/        # UI 组件（客户端）
└── index.ts           # 统一导出
```

### 服务端与客户端分离

- ✅ **客户端安全**: 类型定义、hooks、组件
- ❌ **仅服务端**: Schema 定义、API 处理函数、数据库工具

### 路由与功能模块

- **Routes** (`app/routes/`): 处理路由，导出 `loader`/`action`
- **Features** (`app/features/`): 业务逻辑，被路由调用

## 🔑 核心功能

### AI 交易管理
- **AI 交易员**: 管理 AI 交易员账户，追踪算法交易策略的账户余额
- **智能订单**: 完整的订单生命周期追踪 (NEW, FILLED, CANCELED)，支持 AI 驱动的决策辅助
- **实时持仓**: AI 交易系统的实时持仓监控和历史分析
- **分析团队**: 存储和检索 AI 生成的交易分析和策略记录

### 客户端界面
- **交互式图表**: 实时账户余额曲线可视化，支持 AI 交易员选择和分析
- **智能订单列表**: AI 生成交易订单的高级筛选和展示
- **投资组合看板**: AI 交易策略的综合投资组合视图

### API 端点

```
GET    /api/v1/traders                    # 获取交易员列表
GET    /api/v1/traders/pnl                # 获取账户余额数据
GET    /api/v1/traders/latest-balance     # 最新余额
GET    /api/v1/orders                     # 查询订单
POST   /api/v1/orders/import              # 导入订单
GET    /api/v1/orders/latest              # 最新订单
GET    /api/v1/analysis-records           # 分析记录
GET    /api/v1/position-records           # 持仓记录
GET    /api/v1/config                     # 系统配置
```

## 🛠️ 快速开始

### 前置要求

- Node.js 20+ (或 Bun)
- Cloudflare 账号
- Wrangler CLI: `npm install -g wrangler`

### 安装

```bash
# 安装依赖
pnpm install

# 登录 Cloudflare
wrangler login
```

### 环境配置

创建 `.env` 或 `.env.local`：

```bash
# 密钥加密所需
ALCHEMY_PASSWORD=your-secure-password

# 可选：会话配置
SESSION_EXPIRY=604800  # 7 天（秒）

# 可选：管理员认证
ADMIN_AUTH_HEADER=auth_admin
ADMIN_AUTH_SECRET=your-secret

# 可选：初始账户余额
INITIAL_ACCOUNT_BALANCE=10000
```

### 开发

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

### 数据库管理

```bash
# 生成迁移文件
pnpm db:generate

# 应用迁移
pnpm db:migrate

# 打开 Drizzle Studio（本地）
pnpm db:studio

# 打开 Drizzle Studio（远程）
pnpm db:studio:remote

# 填充数据库
pnpm db:seed

# 清除填充数据
pnpm db:seed:clear
```

### 部署

```bash
# 部署到 Cloudflare
pnpm deploy

# 销毁所有资源（谨慎操作！）
pnpm destroy
```

## 📚 文档

- [API 示例](API_CURL_EXAMPLES.md) - API 使用示例

## 🎯 开发规范

### 代码风格

- **文件命名**: kebab-case（如 `use-orders.ts`）
- **变量命名**: camelCase
- **常量命名**: SCREAMING_SNAKE_CASE
- **注释语言**: 中文（符合项目约定）
- **导入顺序**: Node 内置 → 第三方 → 项目内部 → 相对路径

### 错误处理

三种错误类型：
- `BusinessError`: 业务逻辑错误
- `SystemError`: 系统/基础设施错误
- `ValidationError`: 输入验证错误

### API 标准

- RESTful 约定: 资源使用复数名词
- URL 版本化: `/api/v1/resource`
- 响应格式: `{success, data/error, meta}`
- 输入验证: Zod schemas

### 数据库约定

- 表名: 复数形式，snake_case
- 字段: snake_case
- 主键: `id`
- 时间戳: `created_at`, `updated_at`
- 所有变更通过 migration 进行

## 🔒 安全

- 基于 KV 存储的会话认证
- 通过 header + secret 的管理员认证
- 敏感数据使用环境变量
- 使用 Zod 进行输入验证

## 🌟 关于 Hubble AI

**Hubble AI Trading Frontend** 是 Hubble AI 生态系统的一部分，为 AI 驱动的交易平台提供开源前端基础设施。本项目使开发者能够构建与 AI 交易策略和算法无缝集成的复杂交易界面。

### 开源

本项目是开源的，允许社区为他们的 AI 交易需求贡献、定制和扩展平台。

## 📝 许可证

MIT 许可证 - 详见 LICENSE 文件
