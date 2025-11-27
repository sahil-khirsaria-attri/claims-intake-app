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
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Shield,
  Wrench,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIExceptionPanelProps {
  claimId: string
  hasFailures: boolean
}

type ExceptionAnalysis = {
  summary: string
  rootCauses: Array<{
    issue: string
    explanation: string
    severity: "critical" | "major" | "minor"
  }>
  suggestedFixes: Array<{
    action: string
    description: string
    autoFixable: boolean
    fixValue?: string
  }>
  riskAssessment: {
    denialLikelihood: "high" | "medium" | "low"
    reasoning: string
  }
  recommendedAction: "auto_fix" | "manual_review" | "reject" | "approve_with_warning"
}

export function AIExceptionPanel({ claimId, hasFailures }: AIExceptionPanelProps) {
  const [analysis, setAnalysis] = useState<ExceptionAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchAnalysis = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.getAnalysis(claimId, "exceptions")
      if (response.error) {
        setError(response.error)
      } else if (response.data?.exceptionAnalysis) {
        setAnalysis(response.data.exceptionAnalysis)
      }
    } catch (err) {
      setError("Failed to load AI analysis")
    } finally {
      setIsLoading(false)
      setHasLoaded(true)
    }
  }

  useEffect(() => {
    if (hasFailures && !hasLoaded) {
      fetchAnalysis()
    }
  }, [hasFailures, claimId, hasLoaded])

  if (!hasFailures) {
    return null
  }

  const severityColors = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    major: "bg-warning/10 text-warning border-warning/20",
    minor: "bg-muted text-muted-foreground border-border",
  }

  const riskColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  }

  const actionLabels = {
    auto_fix: { label: "Auto-Fix Available", icon: Wrench, color: "text-success" },
    manual_review: { label: "Manual Review Needed", icon: AlertTriangle, color: "text-warning" },
    reject: { label: "Consider Rejection", icon: XCircle, color: "text-destructive" },
    approve_with_warning: { label: "Approve with Caution", icon: CheckCircle, color: "text-success" },
  }

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
                <CardTitle className="text-base">AI Exception Analysis</CardTitle>
                <CardDescription className="text-xs">Powered by Azure OpenAI</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fetchAnalysis}
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button variant="link" size="sm" onClick={fetchAnalysis}>
                  Retry
                </Button>
              </div>
            ) : analysis ? (
              <>
                {/* Summary */}
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm text-foreground">{analysis.summary}</p>
                </div>

                {/* Risk Assessment */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Denial Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={riskColors[analysis.riskAssessment.denialLikelihood]}>
                      {analysis.riskAssessment.denialLikelihood.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground px-1">{analysis.riskAssessment.reasoning}</p>

                {/* Root Causes */}
                {analysis.rootCauses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Root Causes ({analysis.rootCauses.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.rootCauses.map((cause, index) => (
                        <div
                          key={index}
                          className={cn(
                            "rounded-lg border p-3",
                            severityColors[cause.severity]
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">{cause.issue}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {cause.severity}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1 opacity-80">{cause.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Fixes */}
                {analysis.suggestedFixes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Suggested Fixes ({analysis.suggestedFixes.length})
                    </h4>
                    <div className="space-y-2">
                      {analysis.suggestedFixes.map((fix, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">{fix.action}</span>
                            {fix.autoFixable && (
                              <Badge variant="secondary" className="text-xs shrink-0 bg-success/10 text-success">
                                <Wrench className="h-3 w-3 mr-1" />
                                Auto-fixable
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{fix.description}</p>
                          {fix.fixValue && (
                            <div className="mt-2 rounded bg-muted px-2 py-1">
                              <code className="text-xs text-primary">{fix.fixValue}</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Action */}
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const ActionIcon = actionLabels[analysis.recommendedAction].icon
                      return <ActionIcon className={cn("h-4 w-4", actionLabels[analysis.recommendedAction].color)} />
                    })()}
                    <span className="text-sm font-medium">Recommended Action</span>
                  </div>
                  <Badge variant="outline" className={actionLabels[analysis.recommendedAction].color}>
                    {actionLabels[analysis.recommendedAction].label}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Click refresh to analyze exceptions</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
