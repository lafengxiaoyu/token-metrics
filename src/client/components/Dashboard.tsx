import { useState, useMemo, useCallback, useEffect, type FormEvent } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import {
  BarChart, Bar, Cell, LineChart, Line,
  ComposedChart, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {fetchDaily, fetchProjects, fetchAnalytics, fetchHourlyActivity, fetchQuota, fetchInsights, fetchFileActivity, fetchSessionDurations, fetchEfficiencyCoach, updateCreditSettings, TimeRangeKey } from '../api/client.js';
import type { ProviderStatusDTO, FileActivityDTO, SessionDurationDTO } from '../../shared/types.js';
import { useCcusageData } from '../hooks/useCcusageData.js';
import { useLocalStorageState } from '../hooks/useLocalStorageState.js';
import { formatCredits, formatDate, formatTokens, formatUSD, formatPercent, formatProjectName } from '../utils/formatters.js';
import { shortModelName } from '../utils/modelNames.js';
import { isSyntheticModel }from '../utils/syntheticModelFilter.js';
import { AnalyticsSection } from './AnalyticsSection.js';
import { HeatmapSection } from './HeatmapSection.js';
import { InsightsSection } from './InsightsSection.js';
import { AdditionalInsightsSection } from './AdditionalInsightsSection.js';
import { EfficiencyCoachSection } from './EfficiencyCoachSection.js';
import { useAdvancedInsights } from '../hooks/useAdvancedInsights.js';
import type { DailyEntry, MetricMode } from '../../shared/types.js';

const C = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6'];

const TIME_RANGES = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: 'mtd', label: 'MTD', days: -1 }, // Month to Date
  { key: '30d', label: '30D', days: 30 },
  { key: '60d', label: '60D', days: 60 },
  { key: 'all', label: 'ALL', days: 0 },
] as const;

type LocalTimeRangeKey = typeof TIME_RANGES[number]['key'];

function InsightCard({ label, title, detail, badge }: { label: string; title: string; detail: string; badge?: string }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(120,113,108,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(120,113,108,0.09)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-stone-400">{label}</p>
        {badge ? <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-600">{badge}</span> : null}
      </div>
      <div>
        <p className="text-2xl font-extrabold tracking-tight text-stone-900">{title}</p>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-stone-500">{detail}</p>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, insight, accent }: { label: string; value: string; sub?: string; insight?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-5 rounded-2xl bg-white shadow-[0_1px_3px_rgba(120,113,108,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(120,113,108,0.09)]">
      <span className="text-[12px] font-medium text-stone-400">{label}</span>
      <span className={`text-3xl font-extrabold tracking-tighter font-mono mt-1 ${accent ? 'text-indigo-600' : 'text-stone-900'}`}>{value}</span>
      {sub && <span className="text-xs font-medium text-stone-400 mt-0.5">{sub}</span>}
      {insight && <div className="mt-2.5 pt-2.5 border-t border-stone-100 text-[12px] font-medium text-stone-500 leading-relaxed">{insight}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(120,113,108,0.06)] ${className}`}>
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-stone-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-[13px] font-medium text-stone-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

function TooltipBox({ active, payload, label, fmt = formatTokens }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; fmt?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-3.5 py-3 shadow-[0_8px_30px_rgba(120,113,108,0.12)] text-[11px] border border-stone-200/40">
      {label && <div className="text-stone-400 mb-1.5 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span>
          <span className="font-mono text-stone-700">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function FilterTab({ options, value, onChange }: { options: readonly { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-lg">
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-200 ${value === o.key ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ProjectSelect({ projects, value, onChange }: { projects: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-[220px]">
      <option value="">All Projects</option>
      {projects.map(p => <option key={p}value={p}>{formatProjectName(p)}</option>)}
    </select>
  );
}

function filterByTime<T extends { date?: string; startTime?: string }>(data: T[], rangeKey: TimeRangeKey): T[] {
  if (rangeKey === 'all') return data;
  if (rangeKey === 'today') {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    return data.filter(d => {
      const field = d.date || d.startTime || '';
      const dt = new Date(field);
      const fieldStr = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      return fieldStr === todayStr;
    });
  }
  if (rangeKey === 'mtd') {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return data.filter(d => {
      const field = d.date || d.startTime || '';
      return new Date(field) >= firstDayOfMonth;
    });
  }
  const range = TIME_RANGES.find(t => t.key === rangeKey);
  const days = range ? range.days : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter(d => {
    const field = d.date || d.startTime || '';
    return new Date(field) >= cutoff;
  });
}

export function Dashboard() {
      const provider = 'copilot'; // Fixed to copilot only
  const [timeRange, setTimeRange] = useLocalStorageState<LocalTimeRangeKey>('dashboard_timeRange', '30d');
  const [project, setProject] = useLocalStorageState('dashboard_project', '');
  const [showPricing, setShowPricing] = useState(false);
  const [metric, setMetric] = useLocalStorageState<MetricMode>('dashboard_metric', 'tokens');
  const [editingCreditLimit, setEditingCreditLimit] = useState(false);
  const [creditInput, setCreditInput] = useState('3000');
  const [officialUsedInput, setOfficialUsedInput] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  
  // Additional insights state
  const [fileActivity, setFileActivity] = useState<FileActivityDTO | null>(null);
  const [sessionDurations, setSessionDurations] = useState<SessionDurationDTO | null>(null);
  const [additionalLoading, setAdditionalLoading] = useState(true);
  
  // Fetch quota and insights
  const quotaData = useCcusageData(useCallback(() => fetchQuota(), []));
  const insightsData = useCcusageData(useCallback(() => fetchInsights(provider, timeRange), [provider, timeRange]));
  const efficiencyCoachData = useCcusageData(useCallback(() => fetchEfficiencyCoach(provider, project, timeRange), [provider, project, timeRange]));
  const advancedInsights = useAdvancedInsights();

  useEffect(() => {
    if (quotaData.data && !editingCreditLimit) {
      setCreditInput(String(quotaData.data.creditLimit));
      setOfficialUsedInput(quotaData.data.usageSource === 'official-manual' ? String(quotaData.data.spentCredits) : '');
    }
  }, [quotaData.data, editingCreditLimit]);

  async function saveCreditAllowance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const monthlyCredits = Number(creditInput);
    const officialUsedCredits = officialUsedInput.trim() === '' ? undefined : Number(officialUsedInput);
    setCreditSaving(true);
    setCreditError(null);
    try {
      await updateCreditSettings(monthlyCredits, officialUsedCredits);
      await quotaData.refetch();
      setEditingCreditLimit(false);
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : 'Failed to update credit allowance');
    } finally {
      setCreditSaving(false);
    }
  }
  
  useEffect(() => {
    async function fetchAdditional() {
      setAdditionalLoading(true);
      try {
        const [fileRes, sessionRes] = await Promise.all([
          fetchFileActivity(),
          fetchSessionDurations()
        ]);
        setFileActivity(fileRes.data);
        setSessionDurations(sessionRes.data);
      } catch (err) {
        console.error('Failed to fetch additional insights:', err);
      } finally {
        setAdditionalLoading(false);
      }
    }
    fetchAdditional();
  }, []);
  
    useEffect(() => {
    if (!showPricing) return;
    const close = () => setShowPricing(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showPricing]);

      const dailyData = useCcusageData(useCallback(() => fetchDaily(provider, project, timeRange), [provider, project, timeRange]));
  const projectsData = useCcusageData(useCallback(() => fetchProjects(provider, timeRange), [provider, timeRange]));
  const analyticsData = useCcusageData(useCallback(() => fetchAnalytics(provider, project, timeRange), [provider, project, timeRange]));
  const hourlyData = useCcusageData(useCallback(() => fetchHourlyActivity(provider, project, timeRange), [provider, project, timeRange]));

  

  const coreLoading = dailyData.loading && !dailyData.data;
  const coreError = dailyData.error && !dailyData.data;
  const isTokens = metric === 'tokens';
  const selectedMetric: MetricMode = isTokens ? 'tokens' : 'credits';
  const dataKey = isTokens ? 'tokens' : 'credits';
  const isToday = timeRange === 'today';

  const projectList = useMemo(() => {
    if (!projectsData.data) return [];
    return Object.keys(projectsData.data.projects || {}).sort();
  }, [projectsData.data]);

  // Filtered daily data - use dailyData as primary source
  const filteredDaily = useMemo(() => {
    if (dailyData.data) {
      return filterByTime(dailyData.data.daily, timeRange);
    }
    return [];
  }, [dailyData.data, timeRange]);

  // Aggregated data from filteredDaily
  const totals = useMemo(() => {
    return filteredDaily.reduce((acc, d) => ({
      inputTokens: acc.inputTokens + d.inputTokens,
      outputTokens: acc.outputTokens + d.outputTokens,
      totalTokens: acc.totalTokens + d.totalTokens,
      totalCost: acc.totalCost + d.totalCost,
    }), { inputTokens: 0, outputTokens: 0, totalTokens: 0, totalCost: 0 });
  }, [filteredDaily]);

  const activeDays = filteredDaily.length;

    const outputRatio = totals.inputTokens > 0
    ? (totals.outputTokens / totals.inputTokens) * 100
    : 0;

  // Model aggregation from daily data
  const modelAgg = useMemo(() => {
    const modelMap = new Map<string, { name: string; tokens: number; credits: number; inputTokens: number; outputTokens: number }>();
    for (const day of filteredDaily) {
      for (const breakdown of (day.modelBreakdowns || [])) {
        if (isSyntheticModel(breakdown.modelName)) continue;
        const existing = modelMap.get(breakdown.modelName);
        if (existing) {
          existing.inputTokens += breakdown.inputTokens;
          existing.outputTokens += breakdown.outputTokens;
          existing.tokens += breakdown.inputTokens + breakdown.outputTokens;
          existing.credits += breakdown.cost * 100;
        } else {
          modelMap.set(breakdown.modelName, {
            name: breakdown.modelName,
            inputTokens: breakdown.inputTokens,
            outputTokens: breakdown.outputTokens,
            tokens: breakdown.inputTokens + breakdown.outputTokens,
            credits: breakdown.cost * 100,
          });
        }
      }
    }
    return Array.from(modelMap.values()).sort((a, b) => b.tokens - a.tokens);
  }, [filteredDaily]);

  // Model trend data for chart
  const modelTrendData = useMemo(() => {
    return filteredDaily.map(d => {
      const entry: Record<string, string | number> = {
        date: formatDate(d.date),
      };
      for (const breakdown of (d.modelBreakdowns || [])) {
        if (isSyntheticModel(breakdown.modelName)) continue;
        entry[breakdown.modelName] = isTokens ? (breakdown.inputTokens + breakdown.outputTokens) : breakdown.cost * 100;
      }
      return entry;
    });
  }, [filteredDaily, isTokens]);

      // Project pie data
  const projectPieData = useMemo(() => {
    if (!projectsData.data?.projects) return [];
    return Object.entries(projectsData.data.projects)
      .map(([name, entries]) => ({
        name,
        tokens: entries.reduce((sum, e) => sum + e.totalTokens, 0),
        credits: entries.reduce((sum, e) => sum + e.totalCost * 100, 0),
      }))
      .sort((a, b) => isTokens ? b.tokens - a.tokens : b.credits - a.credits);
  }, [projectsData.data, isTokens]);

      if (coreLoading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">TokenLens</h1>
          </div>
                  </div>
        <div className="skeleton h-8 w-48 rounded-lg mb-2" />
        <div className="skeleton h-4 w-72 rounded-lg mb-8" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="skeleton h-72 rounded-2xl" /><div className="skeleton h-72 rounded-2xl" /></div>
      </div>
    );
  }

  if (coreError) return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">TokenLens</h1>
        </div>
              </div>
      <div className="rounded-2xl bg-red-50 border border-red-200/60 p-5"><div className="text-red-600 text-sm font-medium">{dailyData.error}</div></div>
    </div>
  );

  if (!dailyData.data) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10">
      {/* Narrative Header & Filter Bar */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">TokenLens</h1>
            <p className="text-[14px] font-medium text-stone-500 leading-relaxed">
              Monitor Copilot CLI usage, AI credits, and working patterns.
            </p>
          </div>
                  </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6 p-4 bg-white rounded-2xl border border-stone-200/50 shadow-sm w-fit">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Time range</span>
              <FilterTab options={TIME_RANGES} value={timeRange} onChange={v => setTimeRange(v as LocalTimeRangeKey)} />
            </div>

            {projectList.length > 0 && (
              <>
                <div className="w-px h-10 bg-stone-200/60 hidden sm:block"></div>
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Project</span>
                  <ProjectSelect projects={projectList} value={project} onChange={setProject} />
                </div>
              </>
            )}

            <div className="w-px h-10 bg-stone-200/60 hidden sm:block"></div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Metric</span>
              <FilterTab options={[{ key: 'tokens', label: 'Tokens' }, { key: 'credits', label: 'AI Credits' }]} value={selectedMetric} onChange={v => setMetric(v as MetricMode)} />
            </div>
          </div>
        </div>
      </div>

      {/* AI credit allowance */}
      {quotaData.data && (
        <div className="mb-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Monthly AI Credit Allowance</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {new Date(quotaData.data.periodStart).toLocaleDateString()} - {new Date(quotaData.data.periodEnd).toLocaleDateString()}
              </p>
            </div>
            {editingCreditLimit ? (
              <form onSubmit={saveCreditAllowance} className="flex w-full flex-col items-end gap-2 sm:w-auto">
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-stone-500">
                    Monthly allowance
                    <input
                      aria-label="Monthly AI credit allowance"
                      type="number"
                      min="1"
                      max="10000000"
                      step="1"
                      value={creditInput}
                      onChange={event => setCreditInput(event.target.value)}
                      className="h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 text-right font-mono text-sm font-semibold text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 sm:w-32"
                      autoFocus
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-stone-500">
                    Official credits used
                    <input
                      aria-label="Official AI credits used"
                      type="number"
                      min="0"
                      max="10000000"
                      step="1"
                      placeholder="Use local estimate"
                      value={officialUsedInput}
                      onChange={event => setOfficialUsedInput(event.target.value)}
                      className="h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 text-right font-mono text-sm font-semibold text-stone-900 outline-none placeholder:text-[10px] placeholder:font-sans placeholder:font-normal focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 sm:w-40"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="submit" disabled={creditSaving} title="Save allowance" aria-label="Save allowance" className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
                    <Check size={16} />
                  </button>
                  <button type="button" title="Cancel" aria-label="Cancel allowance edit" onClick={() => { setEditingCreditLimit(false); setCreditError(null); }} className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100">
                    <X size={16} />
                  </button>
                </div>
                {creditError ? <p className="max-w-80 text-right text-[11px] text-red-600">{creditError}</p> : null}
              </form>
            ) : (
              <div className="flex items-center gap-2 text-right">
                <div>
                  <div className="text-2xl font-bold text-stone-900">{formatCredits(quotaData.data.spentCredits)}</div>
                  <div className="text-xs text-stone-500">
                    of {formatCredits(quotaData.data.creditLimit)} credits · {quotaData.data.usageSource === 'official-manual' ? 'official usage' : 'local estimate'}
                  </div>
                </div>
                <button type="button" title="Edit credit settings" aria-label="Edit AI credit settings" onClick={() => setEditingCreditLimit(true)} className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
          
          {/* Progress Bar with Percentage */}
          <div className="relative h-8 bg-white/60 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full transition-all duration-500 flex items-center justify-center ${
                quotaData.data.status === 'over' || quotaData.data.status === 'exhausted' ? 'bg-red-500' :
                quotaData.data.status === 'near' ? 'bg-amber-500' : 
                'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, quotaData.data.percentUsed)}%` }}
            >
              {quotaData.data.percentUsed > 10 && (
                <span className="text-white text-xs font-bold">{quotaData.data.percentUsed.toFixed(1)}%</span>
              )}
            </div>
            {quotaData.data.percentUsed <= 10 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${
                  quotaData.data.status === 'over' || quotaData.data.status === 'exhausted' ? 'text-red-600' :
                  quotaData.data.status === 'near' ? 'text-amber-600' : 
                  'text-emerald-700'
                }`}>{quotaData.data.percentUsed.toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div>
              <div className="text-stone-500 mb-0.5">{quotaData.data.usageSource === 'official-manual' ? 'Official usage' : 'Local CLI estimate'}</div>
              <div className="text-stone-900 font-semibold">{formatCredits(quotaData.data.spentCredits)} credits</div>
            </div>
            <div>
              <div className="text-stone-500 mb-0.5">Local CLI estimate</div>
              <div className="text-stone-900 font-semibold">{formatCredits(quotaData.data.localEstimatedCredits)} credits</div>
            </div>
            <div>
              <div className="text-stone-500 mb-0.5">Estimated API value</div>
              <div className="text-stone-900 font-semibold">{formatUSD(quotaData.data.spentApiEquivalentUsd)}</div>
            </div>
          </div>
          <p className="mt-3 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
            {quotaData.data.usageSource === 'official-manual'
              ? `Official usage was entered manually${quotaData.data.officialUsageUpdatedAt ? ` on ${new Date(quotaData.data.officialUsageUpdatedAt).toLocaleDateString()}` : ''}. Local CLI usage remains an estimate for comparison.`
              : `Showing a local estimate from Copilot CLI logs. Enter GitHub's official usage above when the company shared-pool balance differs.`}
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <KPICard label="Total tokens" value={formatTokens(totals.totalTokens)} accent insight="The primary volume indicator for the selected period." />
        <KPICard label="Input context" value={formatTokens(totals.inputTokens)} sub="input tokens" insight="Total context tokens consumed."/>
        <KPICard label="Output context" value={formatTokens(totals.outputTokens)} sub="model generated" insight="Tokens generated by models." />
        <KPICard label="Output/Input" value={formatPercent(outputRatio)} insight="Ratio of generation to context." />
        <KPICard label="AI credits" value={formatCredits(totals.totalCost * 100)} insight={`${formatUSD(totals.totalCost)} estimated API-equivalent value.`} />
        {quotaData.data ? (
          <KPICard 
            label="Credit usage"
            value={`${quotaData.data.percentUsed.toFixed(0)}%`}
            insight={`${quotaData.data.status === 'over' ? 'Over allowance' : quotaData.data.status === 'exhausted' ? 'Allowance exhausted' : quotaData.data.status === 'near' ? 'Near allowance' : 'On track'} - ${formatCredits(quotaData.data.spentCredits)} / ${formatCredits(quotaData.data.creditLimit)} credits (${quotaData.data.usageSource === 'official-manual' ? 'official' : 'local estimate'})`}
          />
        ) : insightsData.data ? (
          <KPICard 
            label="Weekly trend" 
            value={insightsData.data.weeklyTrend >= 0 ? `+${insightsData.data.weeklyTrend.toFixed(1)}%` : `${insightsData.data.weeklyTrend.toFixed(1)}%`}
            insight={`${insightsData.data.weeklyTrend >= 0 ? '📈 Up' : '📉 Down'} - This week ${formatUSD(insightsData.data.lastWeekCost)} vs last week ${formatUSD(insightsData.data.prevWeekCost)}`}
          />
        ) : null}
      </div>

      {/* Insights Row */}
      {insightsData.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-xl border border-stone-200/50 shadow-sm">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Avg per session</div>
            <div className="text-2xl font-bold text-stone-900">{formatTokens(insightsData.data.avgTokensPerSession)}</div>
            <div className="text-xs text-stone-500 mt-1">tokens/session</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-stone-200/50 shadow-sm">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Avg credits per day</div>
            <div className="text-2xl font-bold text-stone-900">{formatCredits(insightsData.data.avgCostPerDay * 100)}</div>
            <div className="text-xs text-stone-500 mt-1">AI credits/day</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-stone-200/50 shadow-sm">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Avg calls per day</div>
            <div className="text-2xl font-bold text-stone-900">{insightsData.data.avgCallsPerDay}</div>
            <div className="text-xs text-stone-500 mt-1">calls/day</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-stone-200/50 shadow-sm">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Peak hour</div>
            <div className="text-2xl font-bold text-stone-900">
              {insightsData.data.peakHour !== null ? `${String(insightsData.data.peakHour).padStart(2, '0')}:00` : 'N/A'}
            </div>
            <div className="text-xs text-stone-500 mt-1">most active</div>
          </div>
        </div>
      )}

      {/* Credit pacing insights */}
      {quotaData.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200/50 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Credits remaining</div>
            <div className="text-2xl font-bold text-emerald-950">
              {formatCredits(quotaData.data.remainingCredits)}
            </div>
            <div className="text-xs text-emerald-700 mt-1">
              {Math.max(0, 100 - quotaData.data.percentUsed).toFixed(1)}% remaining
            </div>
          </div>
          <div className="p-4 bg-sky-50 rounded-lg border border-sky-200/50 shadow-sm">
            <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Daily credit pace</div>
            <div className="text-2xl font-bold text-sky-950">
              {formatCredits(quotaData.data.dailyCreditBudget)}
            </div>
            <div className="text-xs text-sky-700 mt-1">credits/day to stay within allowance</div>
          </div>
          <div className="p-4 bg-stone-100 rounded-lg border border-stone-200/70 shadow-sm">
            <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">{quotaData.data.usageSource === 'official-manual' ? 'Current variance' : 'Projected variance'}</div>
            <div className={`text-2xl font-bold ${
              quotaData.data.projectedCredits > quotaData.data.creditLimit ? 'text-red-900' : 'text-emerald-900'
            }`}>
              {quotaData.data.projectedCredits > quotaData.data.creditLimit ? '+' : ''}
              {formatCredits(Math.abs(quotaData.data.projectedCredits - quotaData.data.creditLimit))}
            </div>
            <div className={`text-xs mt-1 ${
              quotaData.data.projectedCredits > quotaData.data.creditLimit ? 'text-red-600' : 'text-emerald-700'
            }`}>
              {quotaData.data.projectedCredits > quotaData.data.creditLimit
                ? `${formatUSD(quotaData.data.projectedOverageUsd)} estimated overage`
                : 'credits below allowance'}
            </div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200/50 shadow-sm">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Allowance resets in</div>
            <div className="text-2xl font-bold text-amber-900">{quotaData.data.daysUntilReset}</div>
            <div className="text-xs text-amber-700 mt-1">
              {new Date(quotaData.data.periodEnd).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Model Trend (bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Model trend" subtitle="Showing top 6 models by volume">
          <ResponsiveContainer width="100%" height={260}>
            {modelAgg.length > 0 ? (
              <BarChart data={modelTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#78716c', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => isTokens ? formatTokens(v) : formatCredits(v)} />
                <Tooltip content={<TooltipBox fmt={isTokens ? formatTokens : formatCredits} />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                {modelAgg.slice(0, 6).map((m, i) => (
                  <Bar key={m.name} dataKey={m.name} stackId="1" fill={C[i % C.length]} fillOpacity={0.85} />
                ))}
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400 text-sm">No model data available</div>
            )}
          </ResponsiveContainer>
        </Panel>

              </div>

      {/* Code Change Trend + Tool Call Trend */}
      {analyticsData.data && (
        <AnalyticsSection analytics={analyticsData.data} timeRange={timeRange} />
      )}

      {/* 24-Hour Activity Heatmap */}
      {hourlyData.data && (
        <div className="mb-4">
          <HeatmapSection entries={hourlyData.data.entries} metric={isTokens ? 'tokens' : 'credits'} isToday={timeRange === 'today'} />
        </div>
      )}


      {/* Non-critical request warnings */}
      {projectsData.error && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-2.5 flex items-center gap-2 text-[12px] text-amber-700 font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {projectsData.error && <span>Projects data unavailable</span>}
        </div>
      )}

      {/* Model Distribution + Project Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Model distribution" subtitle="Ranked by total volume">
          <ResponsiveContainer width="100%" height={260}>
            {modelAgg.length > 0 ? (
              <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Pie
                  data={modelAgg.slice(0, 6)}
                  dataKey={dataKey}
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {modelAgg.slice(0, 6).map((_, index) => (
                    <Cell key={index} fill={C[index % C.length]} fillOpacity={0.85} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox fmt={isTokens ? formatTokens : formatCredits} />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400 text-sm">No model data available</div>
            )}
          </ResponsiveContainer>
        </Panel>

        {!project ? (
          projectsData.loading && !projectsData.data ? (
            <Panel title="Project distribution">
              <div className="flex items-center justify-center h-64 text-stone-400 text-[13px]">
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading project data...
              </div>
            </Panel>
          ) : (
            <Panel title="Project distribution" subtitle={`Top 8 projects by ${isTokens ? 'tokens' : 'AI credits'}`}>
              <ResponsiveContainer width="100%" height={280}>
                {projectPieData.length > 0 ? (
                  <BarChart data={projectPieData.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => isTokens ? formatTokens(v) : formatCredits(v)} />
<YAxis type="category" dataKey="name" tick={{ fill: '#57534e', fontSize: 11 }} axisLine={false} tickLine={false} width={180} tickFormatter={(v: string) => {
                      const parts = v.split('/');
                      return parts.length > 2 ? '.../' + parts.slice(-2).join('/') : v;
                    }}/>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white rounded-lg shadow-lg border border-stone-200 px-3 py-2 text-[12px]">
                          <p className="font-semibold text-stone-700 mb-1">{payload[0]?.payload?.name}</p>
                          <p className="text-stone-500">{isTokens ? formatTokens(Number(payload[0]?.value) || 0) : `${formatCredits(Number(payload[0]?.value) || 0)} credits`}</p>
                        </div>
                      );
}} />
                    <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {projectPieData.slice(0, 8).map((_, index) => (
                        <Cell key={index} fill={C[index % C.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 text-sm">No project data available</div>
                )}
              </ResponsiveContainer>
            </Panel>
          )
        ) : project ? (
          <Panel title="Output / Input ratio" subtitle="Daily generation vs context ratio">
            <ResponsiveContainer width="100%" height={280}>
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No data available</div>
            </ResponsiveContainer>
          </Panel>
        ) : null}
      </div>

      {/* Daily Detail Table */}
      <Panel title="Daily detail" subtitle="Recent 30 days of usage breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 text-stone-400 font-semibold text-[10px]">Date</th>
                <th className="text-right py-3 px-4 text-stone-400 font-semibold text-[10px]">Input</th>
                <th className="text-right py-3 px-4 text-stone-400 font-semibold text-[10px]">Output</th>
                                <th className="text-right py-3 px-4 text-stone-600 font-semibold text-[10px]">Total tokens</th>
                <th className="text-right py-3 px-4 text-stone-400 font-semibold text-[10px]">AI credits</th>
                <th className="text-left py-3 px-4 text-stone-400 font-semibold text-[10px]">Models</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredDaily].reverse().slice(0, 30).map(d => (
                <tr key={d.date} className="border-b border-stone-100 hover:bg-stone-50/60 transition-colors">
                  <td className="py-2.5 px-4 text-stone-800 font-semibold">{formatDate(d.date)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-500">{formatTokens(d.inputTokens)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-500">{formatTokens(d.outputTokens)}</td>
                                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-600">{formatTokens(d.totalTokens)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-stone-600 bg-stone-50/40">{formatCredits(d.totalCost * 100)}</td>
                  <td className="py-2.5 px-4text-stone-500 font-medium truncate max-w-[200px]">{d.modelsUsed.filter(m => !isSyntheticModel(m)).map(shortModelName).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Advanced Insights Section */}
      <InsightsSection 
        security={advancedInsights.security}
        reasoning={advancedInsights.reasoning}
        conversation={advancedInsights.conversation}
        classification={advancedInsights.classification}
        efficiency={advancedInsights.efficiency}
        loading={advancedInsights.loading}
      />

      {/* Development Habits Section */}
      <AdditionalInsightsSection
        fileActivity={fileActivity}
        sessionDurations={sessionDurations}
        loading={additionalLoading}
      />

      <div className="mt-4">
        <EfficiencyCoachSection
          data={efficiencyCoachData.data ?? null}
          loading={efficiencyCoachData.loading}
          error={efficiencyCoachData.error}
        />
      </div>
    </div>
  );
}
