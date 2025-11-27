"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { aiApi } from "@/lib/api/client"
import {
  Sparkles,
  User,
  FileText,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIReviewPanelProps {
  claimId: string
}

type ReviewSummary = {
  executiveSummary: string
  patientInfo: string
  serviceDetails: string
  financialSummary: string
  validationStatus: string
  riskFactors: string[]
  recommendations: string[]
  priorityLevel: "urgent" | "high" | "normal" | "low"
}

export function AIReviewPanel({ claimId }: AIReviewPanelProps) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const fetchSummary = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.getAnalysis(claimId, "review")
      if (response.error) {
        setError(response.error)
      } else if (response.data?.reviewSummary) {
        setSummary(response.data.reviewSummary)
      }
    } catch (err) {
      setError("Failed to load AI summary")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [claimId])

  const priorityColors = {
    urgent: "bg-destructive text-destructive-foreground",
    high: "bg-warning text-warning-foreground",
    normal: "bg-primary text-primary-foreground",
    low: "bg-muted text-muted-foreground",
  }

  const SummarySection = ({
    icon: Icon,
    title,
    content,
    className,
  }: {
    icon: typeof User
    title: string
    content: string
    className?: string
  }) => (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-sm text-foreground">{content}</p>
    </div>
  )

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">AI Review Assistant</CardTitle>
                <CardDescription className="text-xs">Intelligent claim summary</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {summary && (
                <Badge className={priorityColors[summary.priorityLevel]}>
                  <Clock className="h-3 w-3 mr-1" />
                  {summary.priorityLevel.charAt(0).toUpperCase() + summary.priorityLevel.slice(1)} Priority
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fetchSummary}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button variant="link" size="sm" onClick={fetchSummary}>
                  Retry
                </Button>
              </div>
            ) : summary ? (
              <>
                {/* Executive Summary */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Executive Summary
                  </h4>
                  <p className="text-sm text-foreground">{summary.executiveSummary}</p>
                </div>

                {/* Info Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummarySection icon={User} title="Patient Information" content={summary.patientInfo} />
                  <SummarySection icon={FileText} title="Service Details" content={summary.serviceDetails} />
                  <SummarySection icon={DollarSign} title="Financial Summary" content={summary.financialSummary} />
                  <SummarySection icon={Shield} title="Validation Status" content={summary.validationStatus} />
                </div>

                {/* Risk Factors */}
                {summary.riskFactors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Risk Factors
                    </h4>
                    <ul className="space-y-1">
                      {summary.riskFactors.map((factor, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-warning">-</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {summary.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {summary.recommendations.map((rec, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <span className="text-success font-bold">{index + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Click refresh to generate summary</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
