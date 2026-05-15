import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { FileActivityDTO, SessionDurationDTO } from '../../shared/types'

type AdditionalInsightsSectionProps = {
  fileActivity: FileActivityDTO | null
  sessionDurations: SessionDurationDTO | null
  loading: boolean
}

export function AdditionalInsightsSection({ fileActivity, sessionDurations, loading }: AdditionalInsightsSectionProps) {
  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
          📈 Development Habits
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{ height: '20px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ height: '200px', background: '#e5e7eb', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
        📈 Development Habits
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {fileActivity && <EditVsViewCard data={fileActivity} />}
        {fileActivity && <LanguageDistributionCard data={fileActivity} />}
        {sessionDurations && <SessionDurationCard data={sessionDurations} />}
      </div>
    </div>
  )
}

function EditVsViewCard({ data }: { data: FileActivityDTO }) {
  const chartData = [
    { name: 'Edit/Create', value: data.totalEdits + data.totalCreates, color: '#8b5cf6' },
    { name: 'View', value: data.totalViews, color: '#3b82f6' }
  ]

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #8b5cf6'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        ⚡ Edit vs View Ratio
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        How you interact with code
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginBottom: '0.25rem' }}>Edits</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>{data.totalEdits}</div>
        </div>
        <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '8px', border: '1px solid #93c5fd' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.25rem' }}>Views</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{data.totalViews}</div>
        </div>
        <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.75rem', color: '#065f46', marginBottom: '0.25rem' }}>Creates</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>{data.totalCreates}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#f5f3ff',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#6b21a8',
        lineHeight: '1.5',
        border: '1px solid #e9d5ff'
      }}>
        <strong>💡 Insight:</strong> {
          data.editVsViewRatio > 60
            ? `You're highly productive! ${data.editVsViewRatio}% of file operations are edits/creates.`
            : data.editVsViewRatio > 40
            ? `Balanced workflow. ${data.editVsViewRatio}% editing, ${100 - data.editVsViewRatio}% reviewing code.`
            : `Research-heavy work. ${100 - data.editVsViewRatio}% of operations are views - you're learning the codebase!`
        }
      </div>
    </div>
  )
}

function LanguageDistributionCard({ data }: { data: FileActivityDTO }) {
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1']

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #3b82f6'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        🔤 Language Distribution
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        Your technology stack
      </div>

      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1rem',
        maxHeight: '250px',
        overflowY: 'auto'
      }}>
        {data.languageDistribution.map((lang, idx) => (
          <div key={lang.language} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>{lang.language}</span>
              <span style={{ color: '#6b7280' }}>{lang.count} files ({lang.percentage}%)</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
              <div style={{ 
                background: colors[idx % colors.length],
                width: `${lang.percentage}%`,
                height: '100%',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#dbeafe',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#1e40af',
        lineHeight: '1.5',
        border: '1px solid #93c5fd'
      }}>
        <strong>💡 Insight:</strong> {
          data.languageDistribution.length > 0
            ? `${data.languageDistribution[0].language} is your primary language (${data.languageDistribution[0].percentage}%). ${
                data.languageDistribution.length > 3 
                  ? `You're working across ${data.languageDistribution.length} different languages!`
                  : 'Focused tech stack.'
              }`
            : 'No language data available.'
        }
      </div>
    </div>
  )
}

function SessionDurationCard({ data }: { data: SessionDurationDTO }) {
  const chartData = [
    { name: 'Short (<15m)', value: data.durationDistribution.short, color: '#10b981' },
    { name: 'Medium (15m-1h)', value: data.durationDistribution.medium, color: '#3b82f6' },
    { name: 'Long (1-4h)', value: data.durationDistribution.long, color: '#f59e0b' },
    { name: 'Very Long (>4h)', value: data.durationDistribution.veryLong, color: '#ef4444' }
  ]

  const longestHours = Math.floor(data.longestSession.durationMinutes / 60)
  const longestMinutes = data.longestSession.durationMinutes % 60

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #f59e0b'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        ⏱️ Session Duration Analysis
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        How long you work in each session
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginBottom: '0.25rem' }}>Avg Duration</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>{data.avgDurationMinutes}m</div>
        </div>
        <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.25rem' }}>Longest</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#991b1b' }}>
            {longestHours}h {longestMinutes}m
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis type="number" tick={{ fill: '#78716c', fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#78716c', fontSize: 10 }} width={100} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#92400e',
        lineHeight: '1.5',
        border: '1px solid #fcd34d'
      }}>
        <strong>💡 Insight:</strong> {
          data.avgDurationMinutes > 120
            ? `Long deep-work sessions! Average ${data.avgDurationMinutes}min indicates sustained focus.`
            : data.avgDurationMinutes > 30
            ? `Moderate session length (${data.avgDurationMinutes}min avg). Good balance of focus and breaks.`
            : `Quick consultations (${data.avgDurationMinutes}min avg). You're using Copilot for rapid assistance!`
        } Total: {data.totalSessions} sessions.
      </div>
    </div>
  )
}
