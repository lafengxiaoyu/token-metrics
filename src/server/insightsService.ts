import { readFile } from 'fs/promises'
import { join } from 'path'
import { extname } from 'path'
import type { SecurityAuditDTO, ReasoningAnalysisDTO, ConversationQualityDTO, SensitiveCommand, QuestionClassificationDTO, ToolEfficiencyDTO, ToolEfficiencyItem, FileActivityDTO, SessionDurationDTO } from '../shared/types.js'

type CopilotEvent = {
  type: string
  data: Record<string, unknown>
  timestamp?: string
}

type PermissionRequest = {
  fullCommandText?: string
  commands?: Array<{ identifier: string; readOnly: boolean }>
  possiblePaths?: string[]
  hasWriteFileRedirection?: boolean
}

type AssistantMessage = {
  reasoningText?: string
  reasoningOpaque?: string
  outputTokens?: number
  toolRequests?: Array<{ name: string }>
}

type UserMessage = {
  content?: string
}

const SENSITIVE_PATTERNS = {
  high: [/\brm\s+-rf\b/, /\bsudo\b/, /\bchmod\s+777\b/, /\bpasswd\b/, /\bmkdir\s+\/etc/],
  medium: [/\brm\b/, /\bchmod\b/, /\bmv\b.*\/(etc|usr|sys)/, /\bnpm\s+install\s+-g\b/],
  low: [/\bgit\s+push\s+--force\b/, /\bnpm\s+publish\b/, /\bdocker\s+rm\b/]
}

const SENSITIVE_PATHS = ['/etc', '/usr', '/sys', '~/.ssh', '/root']

function categorizeCommandRisk(command: string): 'low' | 'medium' | 'high' {
  for (const pattern of SENSITIVE_PATTERNS.high) {
    if (pattern.test(command)) return 'high'
  }
  for (const pattern of SENSITIVE_PATTERNS.medium) {
    if (pattern.test(command)) return 'medium'
  }
  for (const pattern of SENSITIVE_PATTERNS.low) {
    if (pattern.test(command)) return 'low'
  }
  return 'low'
}

function isSensitiveCommand(command: string): boolean {
  const allPatterns = [
    ...SENSITIVE_PATTERNS.high,
    ...SENSITIVE_PATTERNS.medium,
    ...SENSITIVE_PATTERNS.low
  ]
  return allPatterns.some(pattern => pattern.test(command))
}

async function readEventsFromSession(sessionPath: string): Promise<CopilotEvent[]> {
  try {
    const eventsPath = join(sessionPath, 'events.jsonl')
    const content = await readFile(eventsPath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    return lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter((e): e is CopilotEvent => e !== null)
  } catch {
    return []
  }
}

export async function analyzeSecurityAudit(sessionPaths: string[]): Promise<SecurityAuditDTO> {
  let totalCommands = 0
  let writeOperations = 0
  let readOperations = 0
  const sensitiveCommandsMap = new Map<string, { count: number; risk: 'low' | 'medium' | 'high'; timestamp: string }>()
  const allCommandsMap = new Map<string, { count: number; risk: 'low' | 'medium' | 'high'; timestamp: string }>()
  const pathsAccessedSet = new Set<string>()
  const commandsByRisk = { low: 0, medium: 0, high: 0 }

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    for (const event of events) {
      if (event.type === 'permission.requested') {
        const req = event.data.permissionRequest as PermissionRequest
        if (!req) continue

        const command = req.fullCommandText || ''
        if (!command) continue

        totalCommands++

        // Track read/write operations
        const isWrite = req.hasWriteFileRedirection || 
                       req.commands?.some(c => !c.readOnly) ||
                       /\b(rm|mv|cp|chmod|chown|mkdir|touch|edit|create|write)\b/.test(command)
        
        if (isWrite) {
          writeOperations++
        } else {
          readOperations++
        }

        // Categorize by risk
        const risk = categorizeCommandRisk(command)
        commandsByRisk[risk]++

        // Track ALL commands by risk
        const existingAll = allCommandsMap.get(command)
        if (existingAll) {
          existingAll.count++
        } else {
          allCommandsMap.set(command, {
            count: 1,
            risk,
            timestamp: event.timestamp || new Date().toISOString()
          })
        }

        // Track sensitive commands
        if (isSensitiveCommand(command)) {
          const existing = sensitiveCommandsMap.get(command)
          if (existing) {
            existing.count++
          } else {
            sensitiveCommandsMap.set(command, {
              count: 1,
              risk,
              timestamp: event.timestamp || new Date().toISOString()
            })
          }
        }

        // Track paths accessed
        if (req.possiblePaths) {
          for (const path of req.possiblePaths) {
            if (SENSITIVE_PATHS.some(sp => path.includes(sp))) {
              pathsAccessedSet.add(path)
            }
          }
        }
      }
    }
  }

  // Determine overall risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (commandsByRisk.high > 0 || writeOperations > totalCommands * 0.3) {
    riskLevel = 'high'
  } else if (commandsByRisk.medium > 5 || writeOperations > totalCommands * 0.1) {
    riskLevel = 'medium'
  }

  const sensitiveCommands: SensitiveCommand[] = Array.from(sensitiveCommandsMap.entries())
    .map(([command, data]) => ({
      command,
      count: data.count,
      risk: data.risk,
      timestamp: data.timestamp
    }))
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      return riskOrder[a.risk] - riskOrder[b.risk] || b.count - a.count
    })
    .slice(0, 10) // Top 10 most sensitive

  // Build all commands grouped by risk
  const allCommandsList: SensitiveCommand[] = Array.from(allCommandsMap.entries())
    .map(([command, data]) => ({
      command,
      count: data.count,
      risk: data.risk,
      timestamp: data.timestamp
    }))
    .sort((a, b) => b.count - a.count)

  const allCommandsByRisk = {
    low: allCommandsList.filter(cmd => cmd.risk === 'low').slice(0, 50),
    medium: allCommandsList.filter(cmd => cmd.risk === 'medium').slice(0, 50),
    high: allCommandsList.filter(cmd => cmd.risk === 'high').slice(0, 50)
  }

  return {
    totalCommands,
    writeOperations,
    readOperations,
    riskLevel,
    sensitiveCommands,
    pathsAccessed: Array.from(pathsAccessedSet),
    commandsByRisk,
    allCommandsByRisk
  }
}

export async function analyzeReasoningDepth(sessionPaths: string[]): Promise<ReasoningAnalysisDTO> {
  let totalReasoningLength = 0
  let totalWithReasoning = 0
  let totalMessages = 0
  let totalReasoningTokens = 0
  let totalOutputTokens = 0
  const distribution = { light: 0, medium: 0, deep: 0 }

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    for (const event of events) {
      if (event.type === 'assistant.message') {
        const msg = event.data as AssistantMessage
        totalMessages++

        if (msg.outputTokens) {
          totalOutputTokens += msg.outputTokens
        }

        if (msg.reasoningText) {
          totalWithReasoning++
          const length = msg.reasoningText.length
          totalReasoningLength += length

          // Categorize reasoning depth
          if (length < 100) {
            distribution.light++
          } else if (length < 300) {
            distribution.medium++
          } else {
            distribution.deep++
          }

          // Estimate reasoning tokens (rough approximation: 4 chars per token)
          totalReasoningTokens += Math.ceil(length / 4)
        }
      }
    }
  }

  const avgReasoningLength = totalWithReasoning > 0 
    ? Math.round(totalReasoningLength / totalWithReasoning) 
    : 0

  const deepThinkingRate = totalMessages > 0
    ? Math.round((distribution.deep / totalMessages) * 100)
    : 0

  const reasoningTokenRatio = totalOutputTokens > 0
    ? Number((totalReasoningTokens / totalOutputTokens).toFixed(3))
    : 0

  return {
    avgReasoningLength,
    deepThinkingRate,
    reasoningTokenRatio,
    distribution,
    totalWithReasoning,
    totalMessages
  }
}

export async function analyzeConversationQuality(sessionPaths: string[]): Promise<ConversationQualityDTO> {
  let totalQuestionLength = 0
  let totalQuestions = 0
  let totalResponseTokens = 0
  let totalResponses = 0
  let totalToolCalls = 0
  let multiTurnConversations = 0
  let totalConversations = sessionPaths.length
  let totalTurns = 0
  const toolUsageMap = new Map<string, number>()

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    let sessionTurns = 0
    let sessionToolCalls = 0

    for (const event of events) {
      if (event.type === 'user.message') {
        const msg = event.data as UserMessage
        if (msg.content) {
          totalQuestions++
          totalQuestionLength += msg.content.length
          sessionTurns++
        }
      }

      if (event.type === 'assistant.message') {
        const msg = event.data as AssistantMessage
        if (msg.outputTokens) {
          totalResponses++
          totalResponseTokens += msg.outputTokens
        }

        if (msg.toolRequests) {
          const toolCount = msg.toolRequests.length
          totalToolCalls += toolCount
          sessionToolCalls += toolCount
          
          // Track individual tool usage
          msg.toolRequests.forEach(tool => {
            const toolName = tool.name || 'unknown'
            toolUsageMap.set(toolName, (toolUsageMap.get(toolName) || 0) + 1)
          })
        }
      }
    }

    totalTurns += sessionTurns
    if (sessionTurns > 2) {
      multiTurnConversations++
    }
  }

  const avgQuestionLength = totalQuestions > 0
    ? Math.round(totalQuestionLength / totalQuestions)
    : 0

  const avgResponseTokens = totalResponses > 0
    ? Math.round(totalResponseTokens / totalResponses)
    : 0

  const multiTurnRate = totalConversations > 0
    ? Math.round((multiTurnConversations / totalConversations) * 100)
    : 0

  const avgToolsPerQuestion = totalQuestions > 0
    ? Number((totalToolCalls / totalQuestions).toFixed(2))
    : 0

  // Convert tool usage map to sorted array
  const toolBreakdown = Array.from(toolUsageMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    avgQuestionLength,
    avgResponseTokens,
    multiTurnRate,
    avgToolsPerQuestion,
    totalConversations,
    totalTurns,
    toolBreakdown
  }
}

// Question classification patterns - Optimized for conversational and imperative styles
const QUESTION_PATTERNS = {
  debugging: [
    /\b(error|bug|fix|crash|broken|fail|issue|wrong|timeout|exception)\b/i,
    /\b(错误|问题|修复|崩溃|失败|超时|怎么修|如何解决|异常)\b/i,
    /why.*not (work|pass)/i,
    /what.*wrong/i,
    /cannot.*pass/i,
    /how to fix/i,
    /应该怎么修复/i,
    /does not exist/i,
    /cannot find symbol/i,
    /\[ERROR\]/i,
    /RestClientException/i,
    /编译没过/i,
    /mvn.*fail/i,
    /(the )?same problem/i
  ],
  learning: [
    /\b(how|what|why|explain|understand|tell me|show me)\b/i,
    /\b(怎么|什么|为什么|解释|了解|介绍|咋)\b/i,
    /what is this/i,
    /是做什么的/i,
    /can you explain/i,
    /有价值吗/i,
    /是.*吗$/i,
    /最佳实践/i,
    /你建议/i,
    /是应该.*还是/i,
    /which (one|agent|skill)/i,
    /did you mean/i,
    /is.*part of/i
  ],
  implementation: [
    /\b(implement|create|build|add|make|develop|写|创建|实现|开发|新增)\b/i,
    /\b(修改|update|change|refactor|重构|改|替换|扩展)\b/i,
    /create (a |some )?/i,
    /add.*to/i,
    /let's (make|create|build)/i,
    /^(go ahead|继续|resume|do it|di it|execute|run)$/i,
    /把.*改/i,
    /用.*方式/i,
    /增加.*范型/i,
    /put.*into/i,
    /give.*introduction/i
  ],
  investigation: [
    /\b(check|find|search|look|查看|查找|搜索|看一下|分析)\b/i,
    /\b(review|analyze|analyse|检查|审查|Review|improve)\b/i,
    /show me/i,
    /where is/i,
    /list (all|the)/i,
    /有没有/i,
    /help me (to )?analy[sz]e/i,
    /^@\//i,
    /\.java:/i,
    /there is a skill/i
  ],
  analysis: [
    /\b(statistics|stats|report|统计|报告|性能|performance|metrics|quota)\b/i,
    /how many/i,
    /what's the/i,
    /give me.*skill/i,
    /<skill-context/i,
    /everytime.*show/i,
    /left quota/i
  ],
  deployment: [
    /\b(deploy|run|start|launch|运行|启动|部署|注册|register|install)\b/i,
    /in production/i,
    /mvn (install|clean|package)/i
  ],
  configuration: [
    /^(ls|cd|pwd|alias|export|set|git|gh|npm|mvn)\b/i,  // Shell commands
    /^alias /i,
    /^aijava|^ai[a-z]+\b/i,  // Custom aliases
    /how to (attach|configure|setup|use)/i,
    /everytime after/i,
    /(command|option) how to/i
  ]
}

export async function classifyQuestions(sessionPaths: string[]): Promise<QuestionClassificationDTO> {
  const counts = {
    debugging: 0,
    learning: 0,
    implementation: 0,
    investigation: 0,
    analysis: 0,
    deployment: 0,
    configuration: 0,
    other: 0
  }

  let total = 0

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    for (const event of events) {
      if (event.type === 'user.message') {
        const msg = event.data as UserMessage
        if (!msg.content) continue

        total++
        const content = msg.content.toLowerCase()
        
        let classified = false
        
        // Check each category
        for (const [category, patterns] of Object.entries(QUESTION_PATTERNS)) {
          if (patterns.some(pattern => pattern.test(content))) {
            counts[category as keyof typeof counts]++
            classified = true
            break
          }
        }

        if (!classified) {
          counts.other++
        }
      }
    }
  }

  // Calculate percentages
  const percentages = {
    debugging: total > 0 ? Math.round((counts.debugging / total) * 100) : 0,
    learning: total > 0 ? Math.round((counts.learning / total) * 100) : 0,
    implementation: total > 0 ? Math.round((counts.implementation / total) * 100) : 0,
    investigation: total > 0 ? Math.round((counts.investigation / total) * 100) : 0,
    analysis: total > 0 ? Math.round((counts.analysis / total) * 100) : 0,
    deployment: total > 0 ? Math.round((counts.deployment / total) * 100) : 0,
    configuration: total > 0 ? Math.round((counts.configuration / total) * 100) : 0,
    other: total > 0 ? Math.round((counts.other / total) * 100) : 0
  }

  return {
    ...counts,
    total,
    percentages
  }
}

export async function analyzeToolEfficiency(sessionPaths: string[]): Promise<ToolEfficiencyDTO> {
  const toolStats = new Map<string, { total: number; succeeded: number; failed: number; durations: number[] }>()

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    const toolExecutions = new Map<string, { name: string; startTime: number }>()

    for (const event of events) {
      if (event.type === 'tool.execution_start') {
        const data = event.data as { toolCallId: string; toolName?: string; name?: string }
        const toolName = data.toolName || data.name
        if (data.toolCallId && toolName) {
          toolExecutions.set(data.toolCallId, {
            name: toolName,
            startTime: new Date(event.timestamp || Date.now()).getTime()
          })
        }
      }

      if (event.type === 'tool.execution_complete') {
        const data = event.data as { toolCallId: string; exitCode?: number; success?: boolean; duration?: number; output?: string }
        const execution = toolExecutions.get(data.toolCallId)
        
        if (execution) {
          const toolName = execution.name
          
          if (!toolStats.has(toolName)) {
            toolStats.set(toolName, { total: 0, succeeded: 0, failed: 0, durations: [] })
          }

          const stats = toolStats.get(toolName)!
          stats.total++

          // Determine success/failure - check success field first, then exitCode
          const isSuccess = data.success !== undefined 
            ? data.success 
            : (data.exitCode === undefined || data.exitCode === 0)
          
          if (isSuccess) {
            stats.succeeded++
          } else {
            stats.failed++
          }

          // Track duration
          if (data.duration !== undefined && data.duration > 0) {
            stats.durations.push(data.duration)
          } else if (event.timestamp) {
            const duration = new Date(event.timestamp).getTime() - execution.startTime
            if (duration > 0 && duration < 300000) { // Reasonable duration < 5 min
              stats.durations.push(duration)
            }
          }

          toolExecutions.delete(data.toolCallId)
        }
      }
    }
  }

  // Convert to array and calculate metrics
  const byTool: ToolEfficiencyItem[] = Array.from(toolStats.entries())
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      succeeded: stats.succeeded,
      failed: stats.failed,
      successRate: stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 100) : 0,
      avgDuration: stats.durations.length > 0 
        ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
        : undefined
    }))
    .sort((a, b) => b.total - a.total) // Sort by usage

  // Calculate overall metrics
  const totalExecutions = byTool.reduce((sum, tool) => sum + tool.total, 0)
  const totalSucceeded = byTool.reduce((sum, tool) => sum + tool.succeeded, 0)
  const overallSuccessRate = totalExecutions > 0 
    ? Math.round((totalSucceeded / totalExecutions) * 100) 
    : 0

  // Calculate average retries (failed attempts / total)
  const totalFailed = byTool.reduce((sum, tool) => sum + tool.failed, 0)
  const avgRetries = totalExecutions > 0 
    ? Number((totalFailed / totalExecutions).toFixed(2))
    : 0

  return {
    overallSuccessRate,
    avgRetries,
    totalTools: byTool.length,
    byTool
  }
}

// Language mapping based on file extensions
const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript React',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript React',
  '.java': 'Java',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.sh': 'Shell',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.json': 'JSON',
  '.xml': 'XML',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.md': 'Markdown',
  '.sql': 'SQL',
  '.vue': 'Vue',
  '.svelte': 'Svelte'
}

function getLanguageFromPath(path: string): string {
  const ext = extname(path).toLowerCase()
  return LANGUAGE_MAP[ext] || 'Other'
}

export async function analyzeFileActivity(sessionPaths: string[]): Promise<FileActivityDTO> {
  let totalEdits = 0
  let totalViews = 0
  let totalCreates = 0
  
  const fileActivityMap = new Map<string, { edits: number; views: number }>()
  const languageCount = new Map<string, number>()

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    for (const event of events) {
      if (event.type === 'tool.execution_start') {
        const data = event.data as { toolCallId: string; toolName?: string; arguments?: any }
        const toolName = data.toolName
        const args = data.arguments || {}
        const path = args.path

        if (toolName === 'edit' && path) {
          totalEdits++
          const existing = fileActivityMap.get(path) || { edits: 0, views: 0 }
          existing.edits++
          fileActivityMap.set(path, existing)
          
          const lang = getLanguageFromPath(path)
          languageCount.set(lang, (languageCount.get(lang) || 0) + 1)
        } else if (toolName === 'view' && path) {
          totalViews++
          const existing = fileActivityMap.get(path) || { edits: 0, views: 0 }
          existing.views++
          fileActivityMap.set(path, existing)
        } else if (toolName === 'create' && path) {
          totalCreates++
          const existing = fileActivityMap.get(path) || { edits: 0, views: 0 }
          existing.edits++
          fileActivityMap.set(path, existing)
          
          const lang = getLanguageFromPath(path)
          languageCount.set(lang, (languageCount.get(lang) || 0) + 1)
        }
      }
    }
  }

  const totalFileOps = totalEdits + totalViews + totalCreates
  const editVsViewRatio = totalFileOps > 0 
    ? Math.round(((totalEdits + totalCreates) / totalFileOps) * 100)
    : 0

  // Language distribution
  const totalLangOps = Array.from(languageCount.values()).reduce((sum, count) => sum + count, 0)
  const languageDistribution = Array.from(languageCount.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage: totalLangOps > 0 ? Math.round((count / totalLangOps) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Top files
  const topFiles = Array.from(fileActivityMap.entries())
    .map(([path, activity]) => ({
      path,
      edits: activity.edits,
      views: activity.views,
      language: getLanguageFromPath(path)
    }))
    .sort((a, b) => b.edits - a.edits)
    .slice(0, 20)

  return {
    editVsViewRatio,
    totalEdits,
    totalViews,
    totalCreates,
    languageDistribution,
    topFiles
  }
}

export async function analyzeSessionDurations(sessionPaths: string[]): Promise<SessionDurationDTO> {
  const durations: number[] = []
  let longestDuration = 0
  let longestDate = ''

  for (const sessionPath of sessionPaths) {
    const events = await readEventsFromSession(sessionPath)
    
    if (events.length === 0) continue

    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]

    if (!firstEvent.timestamp || !lastEvent.timestamp) continue

    const startTime = new Date(firstEvent.timestamp).getTime()
    const endTime = new Date(lastEvent.timestamp).getTime()
    const durationMs = endTime - startTime
    const durationMinutes = Math.round(durationMs / 1000 / 60)

    if (durationMinutes > 0) {
      durations.push(durationMinutes)
      
      if (durationMinutes > longestDuration) {
        longestDuration = durationMinutes
        longestDate = firstEvent.timestamp
      }
    }
  }

  // Calculate statistics
  const totalSessions = durations.length
  const avgDurationMinutes = totalSessions > 0
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / totalSessions)
    : 0

  // Calculate median
  const sorted = [...durations].sort((a, b) => a - b)
  const medianDurationMinutes = totalSessions > 0
    ? sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)]
    : 0

  // Duration distribution
  const durationDistribution = {
    short: durations.filter(d => d < 15).length,
    medium: durations.filter(d => d >= 15 && d < 60).length,
    long: durations.filter(d => d >= 60 && d < 240).length,
    veryLong: durations.filter(d => d >= 240).length
  }

  return {
    avgDurationMinutes,
    medianDurationMinutes,
    totalSessions,
    durationDistribution,
    longestSession: {
      durationMinutes: longestDuration,
      date: longestDate
    }
  }
}
