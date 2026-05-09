import type { Request, Response } from 'express';
import type { ApiResult, ApiWarning } from '../shared/types.js';
import { parseQueryParams }from './request.js';
import {
  getProviderStatuses,
  getSummary,
  getDaily,
  getProjects,
  getModels,
  getProviderUsage,
} from '../usage/service.js';
import {getAnalytics } from './analyticsService.js';
import { getHourlyActivity } from './hourlyActivityService.js';

function ok<T>(data: T, cached = false): ApiResult<T> {
  return {
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      cached,
      warnings: [],
    },
  };
}

function withWarning<T>(data: T, warnings: ApiWarning[], cached = false): ApiResult<T> {
  return {
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      cached,
      warnings,
    },
  };
}

export function registerRoutes(app: import('express').Express): void {
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tokenlens', timestamp: new Date().toISOString() });
  });

  app.get('/api/providers', async (_req, res) => {
    try {
      const statuses = await getProviderStatuses();
      res.json(ok(statuses));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json(withWarning([], [{ code: 'PROVIDER_ERROR', message }]));
    }
  });
app.get('/api/summary', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const summary = await getSummary(query);
      res.json(ok(summary));
    } catch (err) {
if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning(null as unknown as never[], [{ code: 'SUMMARY_ERROR', message: err instanceof Error ?err.message : String(err) }]));
      }
    }
  });

  app.get('/api/daily', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const daily = await getDaily(query);
res.json(ok(daily));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([]as never[], [{ code: 'DAILY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/projects', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const projects = await getProjects(query);
      res.json(ok(projects));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else{
        res.status(500).json(withWarning([] as never[], [{ code: 'PROJECTS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/models', async (req: Request, res) => {
try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const models = await getModels(query);
      res.json(ok(models));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([] as never[], [{ code: 'MODELS_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/provider-usage', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const usage = await getProviderUsage(query);
      res.json(ok(usage));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning([] as never[], [{ code: 'PROVIDER_USAGE_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });

  app.get('/api/analytics', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const analytics = await getAnalytics(query);
      res.json(ok(analytics));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning({
          codeChangeTrend: [],
          toolUsageDistribution: [],
          productivityKPIs: {
            avgLinesPerEdit: 0,
            filesModifiedPerDay: 0,
            addDeleteRatio: 0,
            totalEdits: 0,
            totalFilesModified: 0,
            activeDaysWithEdits: 0,
          },
          toolCallTrend: [],
        }, [{ code: 'ANALYTICS_ERROR', message: err instanceof Error ? err.message: String(err) }]));
      }
    }
  });

  app.get('/api/hourly-activity', async (req: Request, res) => {
    try {
      const query = parseQueryParams(req.query as Record<string, unknown>);
      const hourly = await getHourlyActivity(query);
      res.json(ok(hourly));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json(withWarning({ entries: [] }, [{ code: 'HOURLY_ERROR', message: err instanceof Error ? err.message : String(err) }]));
      }
    }
  });
}
