import { SecurityAuditDTO, ReasoningAnalysisDTO, ConversationQualityDTO, QuestionClassificationDTO, ToolEfficiencyDTO } from '../../shared/types'
import { fetchSecurityAudit, fetchReasoningAnalysis, fetchConversationQuality, fetchQuestionClassification, fetchToolEfficiency } from '../api/client'
import { useState, useEffect } from 'react'

type InsightsData = {
  security: SecurityAuditDTO | null
  reasoning: ReasoningAnalysisDTO | null
  conversation: ConversationQualityDTO | null
  classification: QuestionClassificationDTO | null
  efficiency: ToolEfficiencyDTO | null
  loading: boolean
  error: string | null
}

export function useAdvancedInsights(): InsightsData {
  const [security, setSecurity] = useState<SecurityAuditDTO | null>(null)
  const [reasoning, setReasoning] = useState<ReasoningAnalysisDTO | null>(null)
  const [conversation, setConversation] = useState<ConversationQualityDTO | null>(null)
  const [classification, setClassification] = useState<QuestionClassificationDTO | null>(null)
  const [efficiency, setEfficiency] = useState<ToolEfficiencyDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [securityData, reasoningData, conversationData, classificationData, efficiencyData] = await Promise.all([
          fetchSecurityAudit(),
          fetchReasoningAnalysis(),
          fetchConversationQuality(),
          fetchQuestionClassification(),
          fetchToolEfficiency()
        ])

        setSecurity(securityData)
        setReasoning(reasoningData)
        setConversation(conversationData)
        setClassification(classificationData)
        setEfficiency(efficiencyData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch insights')
        console.error('[useAdvancedInsights] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { security, reasoning, conversation, classification, efficiency, loading, error }
}
