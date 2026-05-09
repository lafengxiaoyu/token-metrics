# TokenLens

**TokenLens** is a local AI coding token usage dashboard that monitors andvisualizes token consumption, costs, and productivity metrics across multiple AI coding tools. All data stays local — no externaltelemetry or cloud dependencies.

---

## Features

### Multi-Provider Support
Tracks usage from 18 AI codingtools in a unified dashboard:
- **Claude Code / Claude Desktop** (`claude`)
- **OpenAI Codex** (`codex`)
- **GitHub Copilot** (`copilot`)
- **Cursor** (`cursor`, `cursor-agent`)
- **Google Gemini CLI** (`gemini`)
- **OpenClaw** (`openclaw`)
- **OpenCode** (`opencode`)
- **Kiro** (`kiro`)
- **Pi / OMP** (`pi`, `omp`)
- **Droid** (`droid`)
- **Roo Code** (`roo-code`)
- **Kilo Code** (`kilo-code`)
- **Qwen** (`qwen`)
- **Goose** (`goose`)
- **Antigravity** (`antigravity`)

### Usage Analytics
- **Token Tracking** — Input, output, cache read/write tokens with cost estimation
- **Cache Efficiency** — Cache hit rate visualization and estimatedcost savings
- **Daily Trends** — Historical usage charts for 7D, 30D, 60D, and custom time ranges
- **Model Distribution** — Piecharts showing which models are used most
- **Provider Comparison** — Switch between providers to compare usage patterns
- **Project Filtering** — Filter usage by specific projects
- **Code Change Trends** — Lines added/deleted from Edit and Write operations
- **Tool Call Analytics** — Track which tools (Edit, Write, Bash, etc.) are used most
- **24-Hour Activity Heatmap** — Visualize activity patterns by hour of day

### Local-First Design
- All data processed and stored locally on your machine
- Session files areparsed directly from provider directories (e.g., `~/.claude/projects/`)
- Disk caching in `~/.cache/tokenlens/` for fast subsequent loads
- No external services, no telemetry, no account required

---

## Requirements

-**Node.js >= 22**
- **npm** or **pnpm**

---

## Quick Start

### Installation

```bash
npm install
```

### Development

Start both the Reactfrontend and Express API server:

```bash
npm run dev
```

This opens the dashboard at `http://localhost:5173` with API server at `http://localhost:3456`.

### Individual Servers

```bash
npm run dev:client  # Vite frontend only (port 5173)
npm run dev:server   # API server only (port 3456)
```

### ProductionBuild

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

## Dashboard Overview

The main dashboard provides:

| Component | Description |
|-----------|-------------|
| **Provider Switcher** | Switch between AI providers (Claude Code, Codex, OpenClaw, More) |
| **KPI Cards** | Total tokens, Input/Output context, Cache hit rate, Cost |
| **Model Trend** | Stacked bar chart of top 6 models over time |
| **Cache Efficiency**| Cost saved via caching, hit rate trend |
| **Code Change Trend** | Lines added/deleted/net from Edit/Write operations |
| **Tool Call Trend** | Frequency of tool usage over time |
| **24-Hour Heatmap** | Activity intensity by hour and day of week |
| **Model Distribution** | Pie chart of model usage share |
| **Project Distribution** | Bar chart of top projects by usage |
| **Daily Detail Table** | Day-by-day breakdown with tokens, cost, and models |

---

## API Reference

All API endpoints return responses wrapped in:

```typescript
{
  "data": T,           // Response payload
  "meta": {
    "generatedAt": string,   // ISO timestamp
    "cached": boolean,       // Whether responsewas served from cache
    "warnings": Array<{ code: string, message: string }>
  }
}
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/providers` | Available providers with status and source counts |
| `GET`| `/api/summary` | Aggregated totals, by provider, by model, by project |
| `GET` | `/api/daily` | Daily usage trends with model/providerbreakdowns |
| `GET` | `/api/projects` | Project-level usage breakdown |
| `GET` | `/api/models` | Model-level usage breakdown |
| `GET` | `/api/provider-usage` | Provider-level usage statistics |
| `GET`| `/api/analytics` | Code change trends, tool usage, productivity KPIs |
| `GET` | `/api/hourly-activity` | Hourly activity data for 24-hour heatmap |

###Query Parameters

Most endpoints support:

| Parameter | Type | Description |
|----------|------|-------------|
| `provider` | `string` | Filter by provider (e.g., `claude`, `codex`) |
| `project` | `string` | Filter by project name |
| `from` | `ISO date` | Start date (default: 30 days ago) |
| `to` | `ISO date` | End date (default: today) |

---

## Architecture

### Data Flow

```
Provider Session Files →Parser → Aggregator → Service Layer → API → Dashboard
     (local files)       (parse)   (group)    (cache)      (REST)   (React)
```

### ProviderDiscovery

Each provider implements a session discovery mechanism that locates session files/directories on the local machine:

- **Claude**: `~/.claude/projects/`
- **Cursor**: `~/.cursor/sessions/`
- **OpenClaw**: `~/.openclaw/sessions/`
- etc.

### Caching Strategy

1. **Memory Cache** — 60-second TTL for API responses
2. **Disk Cache** — `~/.cache/tokenlens/` for daily data persistence
3. **CacheInvalidation** — Automatic refresh when session files change (mtime-based)

---

## Project Structure

```
src/
├──cli/                    # CLI entry point (bin/tokenlens.js)
├── client/                 # React frontend
│   ├── api/               # API client functions (fetchDaily, fetchAnalytics, etc.)
│   ├── components/        # React components
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── AnalyticsSection.tsx
│   │   └── HeatmapSection.tsx
│   ├──hooks/             # Custom hooks (useCcusageData, useLocalStorageState)
│   └── utils/             # Formatters and utilities
├── providers/            # Provider implementations (18 providers)
│   ├── claude.ts
│   ├── codex.ts
│   ├── cursor.ts
│   └── ...               # Each provider parses its own session format
├── server/                #Express API server
│   ├── routes.ts          # API endpoint definitions
│   ├── analyticsService.ts
│   └── hourlyActivityService.ts
├── shared/                # Shared TypeScript types
├── usage/                 # Coreservice logic
│   ├── service.ts         # Main aggregation service
│   ├── query.ts          # Query parameter handling
│   └── aggregate.ts
├── cache/                 # Memory anddisk caching
├── parser.ts              # Session parsing logic
└── models.ts             # Model pricing and cost calculation
```

---

## Tech Stack

### Frontend
- **React 19** — UI framework
- **Vite 6** — Build tool
- **Tailwind CSS 4** — Styling
- **Recharts 2** — Data visualization

### Backend
- **Express5** — HTTP server
- **TypeScript** — Type safety throughout
- **tsx** — TypeScript execution in dev mode

### Testing
- **Vitest** — Unit testing
- **Playwright** — E2E testing

---

## Configuration

TokenLens requires no configuration files. Provider sessiondirectories are automatically discovered based on each provider's known locations.

To add support for a new provider, implementthe `Provider` interface in `src/providers/`:

```typescript
export type Provider = {
  name: string
  displayName: string
  modelDisplayName(model: string): string
  toolDisplayName(rawTool: string): string
  discoverSessions(): Promise<SessionSource[]>
  createSessionParser(source: SessionSource, seenKeys: Set<string>): SessionParser
}
```

---

## Acknowledgments

TokenLens is inspired by and builds upon two excellent open-source projects:

- **[tokendash](https://github.com/samber/tokendash)** — The original token tracking dashboard that pioneered local AI usage monitoring. TokenLens drawsheavily from tokendash's approach to session parsing, heatmap visualization, and provider architecture.
- **[codeburn](https://github.com/samber/codeburn)** — A code analysis CLI tool that TokenLens adapts for parsing session data and extracting codechange metrics.

We extend our thanks to the authors of these projects for their innovative work in theopen-source community.

---

## License

MIT
