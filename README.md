# TokenLens Extended

> **Note**: This is an extended version based on [TokenLens](https://github.com/mikeymiaoxyz/tokenlens) by mikeymiaoxyz. See [ATTRIBUTION.md](ATTRIBUTION.md) for details.

**TokenLens** is a specialized dashboard for **GitHub Copilot CLI** that monitors token usage, analyzes AI reasoning patterns, and provides advanced insights into your coding sessions. All data stays local — no external telemetry or cloud dependencies.

![TokenLens Dashboard](docs/screenshots/dashboard.png)

---

## Features

### GitHub Copilot Focus

This version is optimized exclusively for **GitHub Copilot CLI** users:
- Parses session data from `~/.copilot/session-state/`
- Tracks Copilot-specific models (Claude Sonnet 4.5, Haiku 4.5, Opus 4.5, GPT-4.1)
- Analyzes tool usage patterns specific to Copilot workflows

### Core Analytics

- **Token Tracking** — Input, output, and reasoning tokens with accurate cost estimation
- **Daily Trends** — Historical usage charts with 7-day, 30-day, and custom ranges
- **Model Distribution** — Track which Copilot models you use most (Sonnet/Haiku/Opus/GPT)
- **Project Filtering** — Filter usage by Git repository
- **Tool Call Analytics** — See which tools (bash, view, edit, grep, etc.) are used most
- **24-Hour Activity Heatmap** — Visualize your coding patterns by hour and day

### Advanced Insights 🆕

TokenLens goes beyond basic metrics with **5 intelligent analytics features**:

#### 🔐 Security Audit
- Analyzes command execution patterns
- Categorizes commands by risk level (LOW/MEDIUM/HIGH)
- Tracks sensitive operations (rm, chmod, sudo, etc.)
- Provides security score and recommendations

#### 🧠 Reasoning Analysis
- Measures AI thinking depth (character count of reasoning tokens)
- Categorizes sessions: Light (<100 chars), Medium (100-300), Deep (>300)
- Calculates reasoning-to-output ratio
- Helps understand when Copilot uses deep reasoning

#### 📊 Conversation Quality
- Tracks average question and response lengths
- Identifies multi-turn conversations vs one-off queries
- Measures tool usage efficiency
- Provides insights into engagement depth

#### 🔍 Question Classification
- Automatically categorizes your questions into 7 types:
  - 🐛 Debugging - Error troubleshooting
  - 📚 Learning - How-to and concept questions
  - 🛠️ Implementation - Feature development
  - 🔬 Investigation - Code exploration
  - 📈 Analysis - Performance and optimization
  - 🚀 Deployment - CI/CD and infrastructure
  - ❓ Other - General queries
- Shows percentage distribution with color-coded bars

#### 🎯 Tool Efficiency
- Tracks success rates for each tool
- Identifies retry patterns (failed → success sequences)
- Ranks tools by reliability
- Helps optimize your workflow

![24-Hour Activity Heatmap](docs/screenshots/heatmap.png)

### Local-First Design

- All data processed and stored locally on your machine
- Session files are parsed directly from provider directories (e.g., `~/.claude/projects/`)
- Disk caching in `~/.cache/tokenlens/` for fast subsequent loads
- No external services, no telemetry, no account required

---

## Requirements

- **Node.js >= 22**
- **npm** or **pnpm**

---

## Quick Start

### Installation

**Using npm (global install - recommended):**
```bash
npm install -g @mikeyxyz/tokenlens
tokenlens
```

**Using npx (no install required):**
```bash
npx @mikeyxyz/tokenlens
```

**Using pnpm:**
```bash
pnpm add -g @mikeyxyz/tokenlens
```

### Local Development

Start both the React frontend and Express API server:

```bash
npm run dev
```

This opens the dashboard at `http://localhost:5173` with API server at `http://localhost:3456`.

### Individual Servers

```bash
npm run dev:client  # Vite frontend only (port 5173)
npm run dev:server   # API server only (port 3456)
```

### Production Build

```bash
npm run build
npm start
```

### CLI Options

```bash
tokenlens --port 3456 --no-open  # Start on specific port without opening browser
tokenlens --version               # Show version
```

---

### Budget Tracking 💰

- Set monthly token quotas in `~/.config/codeburn/config.json`
- Real-time usage percentage display
- Visual progress indicators
- Cost trend monitoring

---

## Dashboard Overview

The main dashboard provides:

| Component | Description |
|-----------|-------------|
| **KPI Cards** | Total tokens, Input/Output/Reasoning context, Cost, Budget usage |
| **Model Trend** | Stacked bar chart of Copilot models over time |
| **Tool Call Trend** | Frequency of tool usage over time (bash, view, edit, grep, etc.) |
| **24-Hour Heatmap** | Activity intensity by hour and day of week |
| **Model Distribution** | Pie chart of model usage share (Sonnet vs Haiku vs Opus vs GPT) |
| **Project Distribution** | Bar chart of top projects by token consumption |
| **Daily Detail Table** | Day-by-day breakdown with tokens, cost, and sessions |
| **Advanced Insights** | 5 intelligent analytics cards (Security, Reasoning, Quality, Classification, Efficiency) |

---

## API Reference

All API endpoints return responses wrapped in:

```typescript
{
  "data": T,           // Response payload
  "meta": {
    "generatedAt": string,// ISO timestamp
    "cached": boolean,        // Whether response was served from cache
    "warnings": Array<{ code: string, message: string }>
  }
}
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/summary` | Aggregated totals by model and project |
| `GET` | `/api/daily` | Daily usage trends with model breakdowns |
| `GET` | `/api/projects` | Project-level usage breakdown |
| `GET` | `/api/models` | Model-level usage breakdown |
| `GET` | `/api/analytics` | Tool usage and productivity KPIs |
| `GET` | `/api/hourly-activity` | Hourly activity data for 24-hour heatmap |
| `GET` | `/api/quota` | Budget quota information and usage percentage |
| `GET` | `/api/insights/security` | Security audit analysis |
| `GET` | `/api/insights/reasoning` | AI reasoning depth analysis |
| `GET` | `/api/insights/conversation` | Conversation quality metrics |
| `GET` | `/api/insights/classification` | Question type classification |
| `GET` | `/api/insights/efficiency` | Tool efficiency and success rates |

### Query Parameters

Most endpoints support:

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Filter by provider (e.g., `claude`, `codex`) |
| `project` | `string` | Filter by project name |
| `from` | `ISO date` | Start date (default:30 days ago) |
| `to` | `ISO date` | End date (default: today) |

---

## Architecture

### Data Flow

```
Provider Session Files → Parser → Aggregator → Service Layer → API → Dashboard
     (local files)       (parse)   (group)    (cache)      (REST)   (React)
```

### Session Discovery

TokenLens automatically discovers Copilot CLI sessions from:
- `~/.copilot/session-state/*/events.jsonl` — Event logs with token usage
- `~/.copilot/session-state/*/workspace-artifacts/` — Checkpoints and context files

### Data Processing

1. **Event Parsing** — Reads JSONL event logs from Copilot sessions
2. **Token Extraction** — Captures input, output, and reasoning tokens
3. **Cost Calculation** — Uses LiteLLM pricing data for accurate cost estimation
4. **Insights Analysis** — Analyzes patterns across all sessions for advanced metrics

---

## Project Structure

```
src/
├── cli/                        # CLI entry point (bin/tokenlens.js)
├── client/                     # React frontend
│   ├── api/                   # API client functions
│   ├── components/            # React components
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── InsightsSection.tsx # Advanced insights cards
│   │   ├── AnalyticsSection.tsx
│   │   └── HeatmapSection.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── useCcusageData.ts  # Main data hook
│   │   └── useAdvancedInsights.ts # Insights data hook
│   └── utils/                 # Formatters and utilities
├── providers/                  # Copilot session parser
│   └── copilot.ts             # Parses events.jsonl files
├── server/                     # Express API server
│   ├── routes.ts              # API endpoint definitions
│   ├── analyticsService.ts    # Tool usage analytics
│   ├── insightsService.ts     # Advanced insights logic
│   └── hourlyActivityService.ts
├── shared/                     # Shared TypeScript types
│   └── types.ts               # DTOs for all endpoints
├── usage/                      # Core service logic
│   ├── service.ts             # Main aggregation service
│   └── aggregate.ts           # Data aggregation
├── parser.ts                   # Event parsing logic
└── models.ts                   # Model pricing (LiteLLM data)
```

---

## Tech Stack

### Frontend
- **React19** — UI framework
- **Vite 6** — Build tool
- **Tailwind CSS 4** — Styling
- **Recharts 2** — Data visualization

### Backend
- **Express 5** — HTTP server
- **TypeScript**— Type safety throughout
- **tsx** — TypeScript execution in dev mode

### Testing
- **Vitest** — Unit testing
- **Playwright** — E2E testing

---

## Configuration

### Budget Quota (Optional)

Create `~/.config/codeburn/config.json` to set monthly token limits:

```json
{
  "quota": {
    "monthlyTokenLimit": 1000000
  }
}
```

The dashboard will show:
- Current usage vs quota
- Percentage used
- Remaining tokens
- Visual progress bars

### Session Data

TokenLens automatically reads from:
- **Events**: `~/.copilot/session-state/<session-id>/events.jsonl`
- **Pricing**: `src/data/litellm-snapshot.json` (bundled)

No additional configuration needed!

---

## What's New in v0.2.0

### 🎯 Copilot-Only Focus
- Simplified to focus exclusively on GitHub Copilot CLI
- Removed multi-provider complexity
- Optimized for Copilot's event log format

### 🧠 Advanced Insights (5 New Features)
- **Security Audit** — Command risk analysis
- **Reasoning Analysis** — AI thinking depth metrics
- **Conversation Quality** — Engagement patterns
- **Question Classification** — Automatic categorization
- **Tool Efficiency** — Success rate tracking

### 💰 Budget Tracking
- Monthly token quota support
- Real-time usage percentage
- Visual budget indicators

### 📊 Enhanced Analytics
- Improved cost calculation (99.8% accurate)
- Better model distribution charts
- Refined tool usage tracking

---

## Acknowledgments

TokenLens is inspired by and builds upon two excellent open-source projects:

- **[tokendash](https://github.com/zhangferry/tokendash)** — The original token tracking dashboard that pioneered local AI usage monitoring.
- **[codeburn](https://github.com/getagentseal/codeburn)** — A code analysis CLI tool that TokenLens adapts for session data parsing.

We extend our thanks to the authors of these projects for their innovative work in the open-source community.

---

## License

MIT
