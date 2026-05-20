import type { EfficiencyCoachDTO, EfficiencySessionReview } from '../../shared/types.js';
import { formatTokens, formatUSD } from '../utils/formatters.js';

const bandStyles = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  healthy: 'bg-sky-50 text-sky-700 border-sky-100',
  watch: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-rose-50 text-rose-700 border-rose-100',
};

const bandLabels = {
  high: 'High',
  healthy: 'Healthy',
  watch: 'Watch',
  low: 'Low',
};

function ScorePill({ score, band }: { score: number; band: keyof typeof bandStyles }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold ${bandStyles[band]}`}>
      {score}/100 · {bandLabels[band]}
    </span>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-stone-500">
        <span>{label}</span>
        <span className="font-mono text-stone-700">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-stone-800"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
      <p className="text-[11px] font-bold uppercase text-stone-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-extrabold text-stone-900">{value}</p>
    </div>
  );
}

function SessionRow({ session, showRecommendation }: { session: EfficiencySessionReview; showRecommendation: boolean }) {
  return (
    <details className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-bold text-stone-900">{session.project}</p>
              <span className="text-[11px] font-semibold text-stone-400">{session.category}</span>
              <span className="text-[11px] font-semibold text-stone-400">{session.date}</span>
            </div>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-stone-600">
              {session.reasons.join(' · ')}
            </p>
          </div>
          <ScorePill score={session.score} band={session.band} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-stone-500 sm:grid-cols-5">
          <span>{formatTokens(session.totalTokens)}</span>
          <span>{formatUSD(session.totalCost)}</span>
          <span>{session.durationMinutes} min</span>
          <span>{session.editTurns}/{session.turns} edit turns</span>
          <span>{session.retries} retries</span>
        </div>
      </summary>

      <div className="mt-4 border-t border-stone-200/70 pt-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase text-stone-400">Session Timeline</p>
            <div className="mt-2 space-y-2">
              {session.timeline.map(item => (
                <div key={item.label} className="rounded-md bg-white px-3 py-2">
                  <p className="text-[11px] font-bold text-stone-500">{item.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] font-medium text-stone-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-stone-400">Prompt Rewrite</p>
            <div className="mt-2 rounded-md bg-white px-3 py-2">
              <p className="text-[11px] font-bold text-stone-500">Before</p>
              <p className="mt-0.5 line-clamp-3 text-[12px] font-medium text-stone-700">{session.firstPrompt || 'No prompt captured'}</p>
            </div>
            <div className="mt-2 rounded-md bg-white px-3 py-2">
              <p className="text-[11px] font-bold text-stone-500">After</p>
              <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-stone-700">{session.rewrittenPrompt}</p>
            </div>
          </div>
        </div>
        {showRecommendation && (
          <p className="mt-3 rounded-md bg-white px-3 py-2 text-[12px] font-medium leading-relaxed text-stone-700">
            {session.recommendation}
          </p>
        )}
      </div>
    </details>
  );
}

function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
      <h4 className="text-[13px] font-bold text-stone-900">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CompactItems({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-[12px] font-medium text-stone-400">No issues detected.</p>;
  }
  return (
    <div className="grid gap-2">
      {items.map(item => (
        <p key={item} className="rounded-md bg-white px-3 py-2 text-[12px] font-medium leading-relaxed text-stone-700">{item}</p>
      ))}
    </div>
  );
}

export function EfficiencyCoachSection({ data, loading, error }: { data: EfficiencyCoachDTO | null; loading: boolean; error: string | null }) {
  if (loading && !data) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(120,113,108,0.06)]">
        <h3 className="text-[15px] font-semibold tracking-tight text-stone-900">Efficiency Coach</h3>
        <p className="mt-2 text-[13px] font-medium text-stone-400">Analyzing Copilot CLI sessions...</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(120,113,108,0.06)]">
        <h3 className="text-[15px] font-semibold tracking-tight text-stone-900">Efficiency Coach</h3>
        <p className="mt-2 text-[13px] font-medium text-rose-500">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const recommendationCounts = data.lowEfficiencySessions.reduce<Record<string, number>>((counts, session) => {
    counts[session.recommendation] = (counts[session.recommendation] ?? 0) + 1;
    return counts;
  }, {});
  const shownRecommendations = new Set<string>();

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(120,113,108,0.06)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-stone-900">Efficiency Coach</h3>
          <p className="mt-1 max-w-3xl text-[13px] font-medium leading-relaxed text-stone-500">{data.summary}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-extrabold tracking-tight text-stone-900">{data.score}</p>
          <p className="text-[11px] font-bold uppercase text-stone-400">{bandLabels[data.band]}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <BreakdownBar label="Outcome" value={data.breakdown.outcome} />
          <BreakdownBar label="Focus" value={data.breakdown.focus} />
          <BreakdownBar label="Reliability" value={data.breakdown.reliability} />
          <BreakdownBar label="Cost Fit" value={data.breakdown.cost} />
          <BreakdownBar label="Prompt Clarity" value={data.breakdown.prompt} />
        </div>

        <div className="grid gap-2">
          {data.findings.map((finding) => (
            <div key={finding.title} className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-bold text-stone-900">{finding.title}</p>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  finding.severity === 'high' ? 'bg-rose-100 text-rose-700'
                    : finding.severity === 'medium' ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-200 text-stone-600'
                }`}>
                  {finding.severity}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-stone-500">{finding.detail}</p>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-stone-700">{finding.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Sessions" value={data.weeklyReview.sessions} />
        <MiniStat label="Tokens" value={formatTokens(data.weeklyReview.totalTokens)} />
        <MiniStat label="Cost" value={formatUSD(data.weeklyReview.totalCost)} />
        <MiniStat label="Top task" value={data.weeklyReview.topTaskType} />
        <MiniStat label="Best day" value={data.weeklyReview.bestDay ?? 'N/A'} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ListPanel title="Weekly Review">
          <div className="grid gap-2">
            <p className="rounded-md bg-white px-3 py-2 text-[12px] font-semibold leading-relaxed text-stone-700">{data.weeklyReview.focus}</p>
            <CompactItems items={[...data.weeklyReview.wins, ...data.weeklyReview.improvements].slice(0, 4)} />
          </div>
        </ListPanel>

        <ListPanel title="Prompt Coach">
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-3 rounded-md bg-white px-3 py-2">
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Avg prompt</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-stone-900">{data.promptCoach.avgPromptScore}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-stone-400">Vague rate</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-stone-900">{data.promptCoach.vaguePromptRate}%</p>
              </div>
            </div>
            <CompactItems items={data.promptCoach.commonGaps.slice(0, 3)} />
          </div>
        </ListPanel>

        <ListPanel title="Model Guidance">
          <div className="grid gap-2">
            {data.modelInsights.length === 0 ? (
              <p className="text-[12px] font-medium text-stone-400">No model data available.</p>
            ) : data.modelInsights.slice(0, 3).map(model => (
              <div key={model.model} className="rounded-md bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[12px] font-bold text-stone-800">{model.model}</p>
                  <span className="font-mono text-[11px] font-bold text-stone-500">{model.avgScore}/100</span>
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-stone-500">{model.recommendation}</p>
              </div>
            ))}
          </div>
        </ListPanel>
      </div>

      {data.promptCoach.examples.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-3 text-[13px] font-bold text-stone-900">Prompt Rewrite Examples</h4>
          <div className="grid gap-3 lg:grid-cols-3">
            {data.promptCoach.examples.map(example => (
              <div key={example.before + example.after} className="rounded-lg border border-stone-100 bg-stone-50/70 p-3">
                <p className="text-[11px] font-bold uppercase text-stone-400">Before</p>
                <p className="mt-1 line-clamp-3 text-[12px] font-medium leading-relaxed text-stone-600">{example.before}</p>
                <p className="mt-3 text-[11px] font-bold uppercase text-stone-400">After</p>
                <p className="mt-1 text-[12px] font-semibold leading-relaxed text-stone-800">{example.after}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.lowEfficiencySessions.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-[13px] font-bold text-stone-900">Review Candidates</h4>
          <div className="grid gap-3">
            {data.lowEfficiencySessions.map(session => {
              const isRepeated = recommendationCounts[session.recommendation] > 1;
              const alreadyShown = shownRecommendations.has(session.recommendation);
              shownRecommendations.add(session.recommendation);
              return (
                <SessionRow
                  key={session.sessionId}
                  session={session}
                  showRecommendation={!isRepeated || !alreadyShown}
                />
              );
            })}
          </div>
        </div>
      )}

      {data.projectInsights.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h4 className="mb-3 text-[13px] font-bold text-stone-900">Project Efficiency</h4>
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-[11px] uppercase text-stone-400">
              <tr>
                <th className="py-2 font-bold">Project</th>
                <th className="py-2 font-bold">Sessions</th>
                <th className="py-2 font-bold">Avg Score</th>
                <th className="py-2 font-bold">Tokens</th>
                <th className="py-2 font-bold">Retry Rate</th>
                <th className="py-2 font-bold">Broad Search</th>
                <th className="py-2 font-bold">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.projectInsights.map(project => (
                <tr key={project.project}>
                  <td className="max-w-[220px] truncate py-2 pr-4 font-semibold text-stone-800">{project.project}</td>
                  <td className="py-2 font-mono text-stone-600">{project.sessions}</td>
                  <td className="py-2 font-mono text-stone-600">{project.avgScore}</td>
                  <td className="py-2 font-mono text-stone-600">{formatTokens(project.totalTokens)}</td>
                  <td className="py-2 font-mono text-stone-600">{project.retryRate}%</td>
                  <td className="py-2 font-mono text-stone-600">{project.broadExplorationRate}%</td>
                  <td className="py-2 pr-2 text-[11px] font-medium leading-relaxed text-stone-600">{project.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.categories.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h4 className="mb-3 text-[13px] font-bold text-stone-900">Task Type Baseline</h4>
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="text-[11px] uppercase text-stone-400">
              <tr>
                <th className="py-2 font-bold">Type</th>
                <th className="py-2 font-bold">Sessions</th>
                <th className="py-2 font-bold">Avg Score</th>
                <th className="py-2 font-bold">Avg Tokens</th>
                <th className="py-2 font-bold">Edit Rate</th>
                <th className="py-2 font-bold">Retry Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.categories.slice(0, 6).map(category => (
                <tr key={category.category}>
                  <td className="py-2 font-semibold text-stone-800">{category.category}</td>
                  <td className="py-2 font-mono text-stone-600">{category.sessions}</td>
                  <td className="py-2 font-mono text-stone-600">{category.avgScore}</td>
                  <td className="py-2 font-mono text-stone-600">{formatTokens(category.avgTokens)}</td>
                  <td className="py-2 font-mono text-stone-600">{category.editRate}%</td>
                  <td className="py-2 font-mono text-stone-600">{category.retryRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
