import type { UsageQuery } from '../usage/query.js';
import{ normalizeUsageQuery } from '../usage/query.js';

export function parseQueryParams(query: Record<string, unknown>): UsageQuery {
  return normalizeUsageQuery(query);
}
