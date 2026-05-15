import React from 'react'
import type { SecurityAuditDTO, ReasoningAnalysisDTO, ConversationQualityDTO, QuestionClassificationDTO, ToolEfficiencyDTO } from '../../shared/types'

type InsightsSectionProps = {
  security: SecurityAuditDTO | null
  reasoning: ReasoningAnalysisDTO | null
  conversation: ConversationQualityDTO | null
  classification: QuestionClassificationDTO | null
  efficiency: ToolEfficiencyDTO | null
  loading: boolean
}

export function InsightsSection({ security, reasoning, conversation, classification, efficiency, loading }: InsightsSectionProps) {
  if (loading) {
    return (
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Advanced Insights</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{ height: '20px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ height: '40px', background: '#e5e7eb', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>Advanced Insights</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {security && <SecurityAuditCard data={security} />}
        {reasoning && <ReasoningAnalysisCard data={reasoning} />}
        {conversation && <ConversationQualityCard data={conversation} />}
        {conversation && <ToolUsageCard data={conversation} />}
        {classification && <QuestionClassificationCard data={classification} />}
        {efficiency && <ToolEfficiencyCard data={efficiency} />}
      </div>
    </div>
  )
}

function SecurityAuditCard({ data }: { data: SecurityAuditDTO }) {
  const [expandedRisk, setExpandedRisk] = React.useState<'high' | 'medium' | 'low' | null>(null)
  const [expandedCommandIndex, setExpandedCommandIndex] = React.useState<number | null>(null)

  const writePercentage = data.totalCommands > 0 
    ? Math.round((data.writeOperations / data.totalCommands) * 100) 
    : 0

  const riskColors = {
    low: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
    medium: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    high: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }
  }

  const colors = riskColors[data.riskLevel]

  const filteredCommands = expandedRisk 
    ? data.allCommandsByRisk[expandedRisk]
    : []

  // Get high risk commands for default display
  const highRiskCommands = data.allCommandsByRisk.high.slice(0, 5)

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: `2px solid ${colors.border}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>🔐 Security Audit</h3>
        <span style={{ 
          padding: '0.25rem 0.75rem', 
          borderRadius: '9999px', 
          fontSize: '0.75rem', 
          fontWeight: '600',
          background: colors.bg,
          color: colors.text
        }}>
          {data.riskLevel.toUpperCase()}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Commands</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{data.totalCommands}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Write Ops</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{data.writeOperations}</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6b7280' }}>Write Operations</span>
          <span style={{ fontWeight: '600' }}>{writePercentage}%</span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ 
            background: colors.border, 
            width: `${writePercentage}%`, 
            height: '100%',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* High Risk Commands */}
      {highRiskCommands.length > 0 && (
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
            ⚠️ High Risk Commands
          </div>
          {highRiskCommands.map((cmd, i) => {
            const isExpanded = expandedCommandIndex === i
            const displayCommand = isExpanded ? cmd.command : 
              cmd.command.length > 80 ? cmd.command.substring(0, 80) + '...' : cmd.command
            
            return (
              <div 
                key={i} 
                onClick={() => setExpandedCommandIndex(isExpanded ? null : i)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem', 
                  background: '#fee2e2',
                  borderRadius: '6px',
                  marginBottom: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  border: '1px solid #fecaca',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fecaca'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fee2e2'
                }}
              >
                <code style={{ 
                  color: '#991b1b', 
                  flex: 1,
                  wordBreak: isExpanded ? 'break-all' : 'normal',
                  whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {displayCommand}
                </code>
                <span style={{ 
                  padding: '0.125rem 0.5rem', 
                  borderRadius: '9999px', 
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: '600',
                  marginLeft: '0.5rem',
                  flexShrink: 0
                }}>
                  {cmd.count}×
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setExpandedRisk(expandedRisk === 'low' ? null : 'low')}
          style={{ 
            textAlign: 'center',
            background: expandedRisk === 'low' ? '#ecfdf5' : 'transparent',
            border: expandedRisk === 'low' ? '2px solid #10b981' : '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (expandedRisk !== 'low') {
              e.currentTarget.style.background = '#ecfdf5'
            }
          }}
          onMouseLeave={(e) => {
            if (expandedRisk !== 'low') {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{data.commandsByRisk.low}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Low</div>
        </button>
        <button
          onClick={() => setExpandedRisk(expandedRisk === 'medium' ? null : 'medium')}
          style={{ 
            textAlign: 'center',
            background: expandedRisk === 'medium' ? '#fef3c7' : 'transparent',
            border: expandedRisk === 'medium' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (expandedRisk !== 'medium') {
              e.currentTarget.style.background = '#fef3c7'
            }
          }}
          onMouseLeave={(e) => {
            if (expandedRisk !== 'medium') {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{data.commandsByRisk.medium}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Medium</div>
        </button>
        <button
          onClick={() => setExpandedRisk(expandedRisk === 'high' ? null : 'high')}
          style={{ 
            textAlign: 'center',
            background: expandedRisk === 'high' ? '#fee2e2' : 'transparent',
            border: expandedRisk === 'high' ? '2px solid #ef4444' : '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (expandedRisk !== 'high') {
              e.currentTarget.style.background = '#fee2e2'
            }
          }}
          onMouseLeave={(e) => {
            if (expandedRisk !== 'high') {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{data.commandsByRisk.high}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>High</div>
        </button>
      </div>

      {/* Expanded Details */}
      {expandedRisk && filteredCommands.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#1f2937',
            marginBottom: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{expandedRisk.toUpperCase()} Risk Commands ({filteredCommands.length})</span>
            <button
              onClick={() => setExpandedRisk(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#6b7280',
                padding: '0',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredCommands.slice(0, 15).map((cmd, idx) => (
              <div 
                key={idx}
                style={{ 
                  padding: '0.5rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.7rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '9999px', 
                    background: riskColors[expandedRisk].bg,
                    color: riskColors[expandedRisk].text,
                    fontSize: '0.65rem',
                    fontWeight: '600'
                  }}>
                    {cmd.count}× executions
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                    {new Date(cmd.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <code style={{ 
                  display: 'block',
                  color: '#374151',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  background: '#f3f4f6',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}>
                  {cmd.command}
                </code>
              </div>
            ))}
            {filteredCommands.length > 15 && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280', 
                textAlign: 'center',
                marginTop: '0.5rem'
              }}>
                ... and {filteredCommands.length - 15} more commands
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReasoningAnalysisCard({ data }: { data: ReasoningAnalysisDTO }) {
  const total = data.distribution.light + data.distribution.medium + data.distribution.deep
  const lightPct = total > 0 ? Math.round((data.distribution.light / total) * 100) : 0
  const mediumPct = total > 0 ? Math.round((data.distribution.medium / total) * 100) : 0
  const deepPct = total > 0 ? Math.round((data.distribution.deep / total) * 100) : 0

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #8b5cf6'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        🧠 Reasoning Analysis
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        Extended thinking token usage
      </div>

      {/* Explanation Box */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#fffbeb',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#92400e',
        lineHeight: '1.5',
        border: '1px solid #fcd34d'
      }}>
        <strong>ℹ️ What is this?</strong> Copilot uses extended thinking (reasoning tokens) for complex tasks.
        <ul style={{ margin: '0.5rem 0 0 1.2rem', paddingLeft: '0' }}>
          <li><strong>Light</strong>: Quick responses (&lt;100 chars reasoning)</li>
          <li><strong>Medium</strong>: Moderate analysis (100-300 chars)</li>
          <li><strong>Deep</strong>: Complex problem-solving (&gt;300 chars)</li>
        </ul>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Length</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{data.avgReasoningLength}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>chars</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deep Thinking</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{data.deepThinkingRate}%</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>of messages</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6b7280' }}>Reasoning/Output Ratio</span>
          <span style={{ fontWeight: '600' }}>{data.reasoningTokenRatio.toFixed(3)}</span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ 
            background: '#8b5cf6', 
            width: `${Math.min(data.reasoningTokenRatio * 100, 100)}%`, 
            height: '100%' 
          }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
          How much thinking vs output (higher = more analysis per response)
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
          Thinking Depth Distribution
        </div>
        
        {/* Light Reasoning */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#6b7280' }}>💡 Light ({data.distribution.light} msgs)</span>
            <span style={{ fontWeight: '600', color: '#60a5fa' }}>{lightPct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#60a5fa', width: `${lightPct}%`, height: '100%' }} />
          </div>
        </div>

        {/* Medium Reasoning */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#6b7280' }}>🤔 Medium ({data.distribution.medium} msgs)</span>
            <span style={{ fontWeight: '600', color: '#3b82f6' }}>{mediumPct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#3b82f6', width: `${mediumPct}%`, height: '100%' }} />
          </div>
        </div>

        {/* Deep Reasoning */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#6b7280' }}>🧠 Deep ({data.distribution.deep} msgs)</span>
            <span style={{ fontWeight: '600', color: '#8b5cf6' }}>{deepPct}%</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#8b5cf6', width: `${deepPct}%`, height: '100%' }} />
          </div>
        </div>
      </div>

      {/* Intelligent Insights */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#faf5ff',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#6b21a8',
        lineHeight: '1.5',
        border: '1px solid #e9d5ff'
      }}>
        <strong>💭 Insight:</strong> {
          deepPct > 40
            ? `High complexity work! ${deepPct}% of responses required deep thinking. You're tackling advanced challenges.`
            : deepPct > 20
            ? `Balanced complexity. ${deepPct}% deep thinking shows you're exploring moderate-to-complex problems.`
            : mediumPct > 50
            ? `Mostly moderate tasks. ${mediumPct}% medium thinking indicates steady problem-solving work.`
            : lightPct > 60
            ? `Quick interactions dominate (${lightPct}% light). Consider exploring more complex, multi-step challenges for deeper insights.`
            : 'Varied task complexity - good mix of quick queries and thoughtful problem-solving!'
        }
      </div>

      <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        {data.totalWithReasoning} of {data.totalMessages} messages have reasoning
      </div>
    </div>
  )
}

function ConversationQualityCard({ data }: { data: ConversationQualityDTO }) {
  // Calculate insights
  const engagementScore = data.multiTurnRate > 50 ? 'High' : data.multiTurnRate > 30 ? 'Medium' : 'Low'
  const engagementColor = data.multiTurnRate > 50 ? '#10b981' : data.multiTurnRate > 30 ? '#f59e0b' : '#6b7280'
  
  const questionComplexity = data.avgQuestionLength > 100 ? 'Detailed' : data.avgQuestionLength > 50 ? 'Moderate' : 'Concise'
  const complexityEmoji = data.avgQuestionLength > 100 ? '📖' : data.avgQuestionLength > 50 ? '📝' : '💬'

  const toolUsageLevel = data.avgToolsPerQuestion > 3 ? 'Heavy' : data.avgToolsPerQuestion > 1.5 ? 'Moderate' : 'Light'
  const toolUsageColor = data.avgToolsPerQuestion > 3 ? '#8b5cf6' : data.avgToolsPerQuestion > 1.5 ? '#3b82f6' : '#6b7280'

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #3b82f6'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        💬 Conversation Quality
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>Interaction patterns analysis</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Question</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
            {data.avgQuestionLength}
            <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.25rem' }}>chars</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: engagementColor, marginTop: '0.25rem' }}>
            {complexityEmoji} {questionComplexity} questions
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Response</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
            {data.avgResponseTokens}
            <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.25rem' }}>tokens</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            ≈ {Math.round(data.avgResponseTokens / 4)} words
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6b7280' }}>Multi-turn Conversations</span>
          <span style={{ fontWeight: '600', color: engagementColor }}>
            {data.multiTurnRate}% • {engagementScore} Engagement
          </span>
        </div>
        <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ 
            background: engagementColor, 
            width: `${data.multiTurnRate}%`, 
            height: '100%' 
          }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
          💡 {data.multiTurnRate > 50 
            ? 'Excellent! Most conversations involve multiple back-and-forth exchanges.'
            : data.multiTurnRate > 30
            ? 'Good engagement with moderate conversation depth.'
            : 'Mostly single-turn queries. Consider more exploratory questions.'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tools/Question</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: toolUsageColor }}>
            {data.avgToolsPerQuestion}
          </div>
          <div style={{ fontSize: '0.75rem', color: toolUsageColor, marginTop: '0.25rem' }}>
            {toolUsageLevel} Usage
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Turns</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
            {data.totalTurns}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {data.totalConversations} sessions
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#f0f9ff',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#1e40af',
        lineHeight: '1.5',
        border: '1px solid #bfdbfe'
      }}>
        <strong>💭 Insight:</strong> {
          data.multiTurnRate > 50 && data.avgToolsPerQuestion > 2
            ? 'Your sessions show deep engagement with complex problem-solving. Great collaboration pattern!'
            : data.multiTurnRate > 30 && data.avgQuestionLength > 70
            ? 'You ask detailed questions with good follow-up. Keep exploring!'
            : data.avgToolsPerQuestion > 3
            ? 'You tackle complex tasks effectively. Consider breaking down into multi-turn conversations for better results.'
            : 'Try asking follow-up questions to get more comprehensive solutions!'
        }
      </div>
    </div>
  )
}

function ToolUsageCard({ data }: { data: ConversationQualityDTO }) {
  if (!data.toolBreakdown || data.toolBreakdown.length === 0) {
    return null
  }

  const totalToolCalls = data.toolBreakdown.reduce((sum, tool) => sum + tool.count, 0)
  const topTool = data.toolBreakdown[0]
  const topToolPercentage = totalToolCalls > 0 
    ? Math.round((topTool.count / totalToolCalls) * 100) 
    : 0

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #8b5cf6'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        🔧 Tool Usage Distribution
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        {data.toolBreakdown.length} tools • {totalToolCalls} total calls
      </div>

      {/* Top Tool Highlight */}
      <div style={{
        marginBottom: '1rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        color: 'white'
      }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Most Used Tool</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
          {topTool.name}
        </div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {topTool.count} calls ({topToolPercentage}%)
        </div>
      </div>

      {/* Tool List */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {data.toolBreakdown.map((tool, idx) => {
          const percentage = totalToolCalls > 0 
            ? Math.round((tool.count / totalToolCalls) * 100)
            : 0
          const barColor = idx === 0 ? '#3b82f6' : idx === 1 ? '#8b5cf6' : idx === 2 ? '#10b981' : '#6b7280'
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''
          
          return (
            <div 
              key={tool.name}
              style={{ 
                padding: '0.5rem',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.25rem'
              }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  color: '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {medal} {tool.name}
                </span>
                <span style={{ 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: barColor,
                  marginLeft: '0.5rem'
                }}>
                  {tool.count}
                </span>
              </div>
              <div style={{ 
                background: '#e5e7eb',
                borderRadius: '9999px',
                height: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: barColor,
                  width: `${percentage}%`,
                  height: '100%',
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: '#9ca3af',
                marginTop: '0.25rem',
                textAlign: 'right'
              }}>
                {percentage}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Tool Usage Insight */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#faf5ff',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#6b21a8',
        lineHeight: '1.5',
        border: '1px solid #e9d5ff'
      }}>
        <strong>💡 Insight:</strong> {
          topToolPercentage > 40
            ? `Heavy reliance on "${topTool.name}" (${topToolPercentage}%). Consider exploring other tools for diverse workflows.`
            : topToolPercentage > 25
            ? `"${topTool.name}" is your go-to tool (${topToolPercentage}%). Good balance with other tools!`
            : `Well-balanced tool usage! "${topTool.name}" leads with ${topToolPercentage}%.`
        }
      </div>
    </div>
  )
}

function QuestionClassificationCard({ data }: { data: QuestionClassificationDTO }) {
  const categories = [
    { key: 'debugging', label: 'Debugging', color: '#ef4444', emoji: '🐛' },
    { key: 'implementation', label: 'Implementation', color: '#8b5cf6', emoji: '🔧' },
    { key: 'investigation', label: 'Investigation', color: '#3b82f6', emoji: '🔍' },
    { key: 'learning', label: 'Learning', color: '#10b981', emoji: '📚' },
    { key: 'analysis', label: 'Analysis', color: '#f59e0b', emoji: '📊' },
    { key: 'deployment', label: 'Deployment', color: '#06b6d4', emoji: '🚀' },
    { key: 'configuration', label: 'Configuration', color: '#14b8a6', emoji: '⚙️' },
    { key: 'other', label: 'Other', color: '#6b7280', emoji: '📝' },
  ] as const

  const sortedCategories = categories
    .map(cat => ({
      ...cat,
      count: data[cat.key],
      percentage: data.percentages[cat.key]
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #f59e0b'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        🔍 Question Classification
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>Question type distribution</div>
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }}>
          {data.total}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>Total Questions</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sortedCategories.map((cat) => (
          <div key={cat.key} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{cat.emoji}</span>
                <span style={{ color: '#4b5563' }}>{cat.label}</span>
              </span>
              <span style={{ fontWeight: '600' }}>{cat.percentage}%</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
              <div style={{ 
                background: cat.color, 
                width: `${cat.percentage}%`, 
                height: '100%',
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
              {cat.count} questions
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolEfficiencyCard({ data }: { data: ToolEfficiencyDTO }) {
  if (data.totalTools === 0) {
    return (
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '2px solid #10b981',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
          🎯 Tool Efficiency
        </h3>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No tool execution data available</div>
      </div>
    )
  }

  const topTools = data.byTool.slice(0, 10)

  const getSuccessColor = (rate: number) => {
    if (rate >= 95) return '#10b981'
    if (rate >= 85) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div style={{ 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '2px solid #10b981'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
        🎯 Tool Efficiency
      </h3>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        Success rates and performance metrics
      </div>

      {/* Overall Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          padding: '0.75rem', 
          background: '#f0fdf4', 
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#15803d', marginBottom: '0.25rem' }}>Success Rate</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>
            {data.overallSuccessRate}%
          </div>
        </div>
        <div style={{ 
          padding: '0.75rem', 
          background: '#fef9c3', 
          borderRadius: '8px',
          border: '1px solid #fde047'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#854d0e', marginBottom: '0.25rem' }}>Avg Retries</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#854d0e' }}>
            {data.avgRetries}
          </div>
        </div>
        <div style={{ 
          padding: '0.75rem', 
          background: '#dbeafe', 
          borderRadius: '8px',
          border: '1px solid #93c5fd'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.25rem' }}>Tools Used</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
            {data.totalTools}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#f0fdf4',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#15803d',
        lineHeight: '1.5',
        border: '1px solid #bbf7d0'
      }}>
        <strong>ℹ️ What does this show?</strong> Success rate indicates how often tools complete without errors. 
        Lower success rates may indicate complex tasks, environment issues, or opportunities for optimization.
      </div>

      {/* Top Tools */}
      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' }}>
        Top Tools by Usage
      </div>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {topTools.map((tool, idx) => {
          const successColor = getSuccessColor(tool.successRate)
          const durationText = tool.avgDuration 
            ? tool.avgDuration > 1000 
              ? `${(tool.avgDuration / 1000).toFixed(1)}s`
              : `${tool.avgDuration}ms`
            : 'N/A'
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''

          return (
            <div 
              key={tool.name}
              style={{ 
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {medal} {tool.name}
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.125rem 0.5rem',
                    background: successColor + '20',
                    color: successColor,
                    borderRadius: '9999px',
                    fontWeight: '600'
                  }}>
                    {tool.successRate}%
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {tool.total} calls
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6b7280' }}>
                <span>✅ {tool.succeeded} succeeded • ❌ {tool.failed} failed</span>
                <span>⏱️ Avg: {durationText}</span>
              </div>

              {/* Success bar */}
              <div style={{ 
                background: '#e5e7eb',
                borderRadius: '9999px',
                height: '4px',
                overflow: 'hidden',
                marginTop: '0.5rem'
              }}>
                <div style={{ 
                  background: successColor,
                  width: `${tool.successRate}%`,
                  height: '100%',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Insight */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#ecfdf5',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#065f46',
        lineHeight: '1.5',
        border: '1px solid #a7f3d0'
      }}>
        <strong>💡 Insight:</strong> {
          data.overallSuccessRate >= 95
            ? `Excellent tool reliability (${data.overallSuccessRate}%)! Your workflows are running smoothly.`
            : data.overallSuccessRate >= 85
            ? `Good overall performance (${data.overallSuccessRate}%). Some tools may need attention.`
            : `Success rate of ${data.overallSuccessRate}% indicates potential issues. Check failed operations for patterns.`
        }
        {data.avgRetries > 0.1 && ` Average ${data.avgRetries} retries per execution suggests room for optimization.`}
      </div>
    </div>
  )
}
