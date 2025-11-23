# Hubble AI Trading Platform 
Live Demo: https://hubble-arena.xyz
> **Advanced AI-powered cryptocurrency trading system with multi-agent collaboration and real-time monitoring**

## 📋 Overview

Hubble AI Trading is a comprehensive platform for autonomous AI-driven cryptocurrency trading. The system combines advanced multi-agent AI architecture with a modern edge-computing frontend to create a complete solution for algorithmic trading.

The platform consists of two main components:

1. **TradingAgents Backend**: An autonomous AI cryptocurrency trading system that uses multi-agent collaboration for market analysis, risk management, and trade execution.

2. **Trading Frontend**: A production-ready, full-stack platform for managing AI-driven trading systems, providing real-time monitoring, analytics, and management capabilities.

## 🤖 Backend: TradingAgents

### Agent Architecture

The backend employs a sophisticated multi-agent system:

- **Technical Research Agent:** Market data analysis (candlesticks, indicators, funding rates, order book) via ERC8004 + A2A + X402
- **Risk Manager Agent:** Safety boundaries and risk assessment
- **Portfolio Manager Agent:** Capital allocation and position management
- **Trader Agent:** Trading decisions and execution planning
- **Summarizer Agent:** Performance reporting

### Key Features

- **LangGraph Workflow**: Multi-agent architecture with state-based communication
- **Tool-based Interactions**: Agents interact via tools (not direct calls)
- **Type-safe Design**: Pydantic models for all AI outputs
- **Closed-loop System**: Analysis → Decision → Execution in agent graph

### Safety Features

- **Protective Orders**: Atomic SL/TP updates, trailing stop, danger zone protection
- **Position Management**: Safe position closing, partial reduction, and SL/TP updates
- **Risk Controls**: Margin monitoring, position sizing, leverage limits

## 🖥️ Frontend: Hubble AI Trading Frontend

### Key Features

- **Real-time Monitoring**: Track multiple AI traders simultaneously
- **Interactive Visualizations**: Monitor account balances with dynamic charts
- **Order Management**: Track orders from creation to execution/cancellation
- **Position Analysis**: Analyze positions with historical context
- **AI Analysis Storage**: Store AI-generated trading insights

### Technical Stack

- **Framework**: React 19 with SSR capabilities
- **Routing**: React Router 7
- **Styling**: TailwindCSS 4, Shadcn UI
- **Edge Computing**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Infrastructure**: Alchemy (Infrastructure as Code)
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI, Lucide Icons
- **Data Visualization**: Recharts
- **Language**: TypeScript

### Architecture

- **Edge-native**: Sub-50ms response times worldwide
- **Feature-based Modules**: Clean separation between business logic and routing
- **Zero-cold-start**: Database queries execute at the edge

## 🚀 Getting Started

### Backend Setup

1. **Install:**
```bash
uv sync
```

2. **Configure** (`config.prod.yaml` / `config.dev.yaml`):
```yaml
system:
  interval_minutes: 5

llm_providers:
  openai_api_key: "your-key"
  deepseek_api_key: "your-key"

accounts:
  - name: "Account1"
    enabled: true
    symbol: "BTCUSDT"
    llm_model: "deepseek-chat"
    exchange:
      api_key: "your-key"
      api_secret: "your-secret"
      base_url: "https://fapi.asterdex.com"
```

3. **Run:**
```bash
python main.py               # Production
python main.py --env dev     # Development
```

### Frontend Setup

1. **Prerequisites:**
- Node.js 20+ (or Bun)
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

2. **Installation:**
```bash
# Install dependencies
pnpm install

# Authenticate with Cloudflare
wrangler login
```

3. **Environment Setup:**
Create `.env` or `.env.local`:
```bash
# Required for secret encryption
ALCHEMY_PASSWORD=your-secure-password

# Optional: Session configuration
SESSION_EXPIRY=604800  # 7 days in seconds

# Optional: Admin authentication
ADMIN_AUTH_HEADER=auth_admin
ADMIN_AUTH_SECRET=your-secret

# Optional: Initial account balance
INITIAL_ACCOUNT_BALANCE=10000
```

4. **Development:**
```bash
# Start development server
pnpm dev

# Type checking
pnpm typecheck
```

5. **Database Management:**
```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio (local)
pnpm db:studio
```

6. **Deployment:**
```bash
# Deploy to Cloudflare
pnpm deploy
```

## 📁 Project Structure

```
hubble-ai-trading/
├── fe/                           # Frontend application
│   ├── app/                      # Application source code
│   │   ├── features/             # Feature-based modules
│   │   │   ├── traders/          # Trader management
│   │   │   ├── orders/           # Order management
│   │   │   ├── positions/        # Position tracking
│   │   │   └── analysis-team/    # AI analysis storage
│   │   ├── routes/               # Route definitions
│   │   └── shared/               # Shared components
│   ├── database/                 # Database schema & migrations
│   └── workers/                  # Edge workers
│
└── trading/                      # Backend application
    ├── main.py                   # Entry point
    ├── config.{prod,dev}.yaml    # Configuration
    ├── tradingagents/
    │   ├── agents/               # AI agents
    │   │   ├── portfolio_manager/
    │   │   ├── risk_manager/
    │   │   ├── trader/
    │   │   └── utils/
    │   ├── dataflows/            # Exchange APIs
    │   ├── config.py             # Config management
    │   └── trading_runner.py     # LangGraph workflow
    └── logs/                     # Logs
```

## 🔒 Security

- Session-based authentication using KV storage
- Admin authentication via header + secret
- Environment variables for sensitive data
- Input validation with Zod
- Secure API key management

## 🌟 About Hubble AI

Hubble AI Trading Platform is part of the Hubble AI ecosystem, providing open-source infrastructure for AI-powered trading. This project enables developers to build sophisticated trading systems that integrate seamlessly with AI strategies and algorithms.

## 📝 License

MIT License - See LICENSE file for details
