"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronRight, RefreshCw, Info } from "lucide-react"
import type { ValidationCheck, ValidationStatus } from "@/lib/types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ValidationPanelProps {
  checks: ValidationCheck[]
  onRevalidate?: () => void
}

const statusConfig: Record<ValidationStatus, { icon: typeof CheckCircle; className: string; bgClass: string }> = {
  pass: { icon: CheckCircle, className: "text-success", bgClass: "bg-success/10" },
  warning: { icon: AlertTriangle, className: "text-warning", bgClass: "bg-warning/10" },
  fail: { icon: XCircle, className: "text-destructive", bgClass: "bg-destructive/10" },
  pending: { icon: Clock, className: "text-muted-foreground", bgClass: "bg-muted" },
}

const categoryLabels = {
  eligibility: "Eligibility Checks",
  code: "Code Validation",
  business_rule: "Business Rules",
  document: "Document Checks",
}

export function ValidationPanel({ checks, onRevalidate }: ValidationPanelProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(["eligibility", "code", "business_rule", "document"])

  const groupedChecks = checks.reduce(
    (acc, check) => {
      if (!acc[check.category]) acc[check.category] = []
      acc[check.category].push(check)
      return acc
    },
    {} as Record<string, ValidationCheck[]>,
  )

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warning: checks.filter((c) => c.status === "warning").length,
    fail: checks.filter((c) => c.status === "fail").length,
    pending: checks.filter((c) => c.status === "pending").length,
  }

  const overallStatus: ValidationStatus =
    summary.fail > 0 ? "fail" : summary.warning > 0 ? "warning" : summary.pending > 0 ? "pending" : "pass"

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-card-foreground">Validation Results</CardTitle>
          <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={onRevalidate}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Re-validate
          </Button>
        </div>

        {/* Summary Bar */}
        <div className="mt-3 flex items-center gap-4">
          <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5", statusConfig[overallStatus].bgClass)}>
            {(() => {
              const StatusIcon = statusConfig[overallStatus].icon
              return <StatusIcon className={cn("h-4 w-4", statusConfig[overallStatus].className)} />
            })()}
            <span className={cn("text-sm font-medium", statusConfig[overallStatus].className)}>
              {overallStatus === "pass" && "All Checks Passed"}
              {overallStatus === "warning" && "Review Recommended"}
              {overallStatus === "fail" && "Issues Found"}
              {overallStatus === "pending" && "Validation Pending"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-success" />
              {summary.pass}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              {summary.warning}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              {summary.fail}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {Object.entries(categoryLabels).map(([category, label]) => {
          const categoryChecks = groupedChecks[category] || []
          if (categoryChecks.length === 0) return null

          const isOpen = openCategories.includes(category)
          const hasFails = categoryChecks.some((c) => c.status === "fail")
          const hasWarnings = categoryChecks.some((c) => c.status === "warning")

          return (
            <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 py-2 text-sm font-medium hover:bg-secondary",
                    hasFails ? "text-destructive" : hasWarnings ? "text-warning" : "text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {label}
                    {hasFails && <XCircle className="h-3.5 w-3.5" />}
                    {!hasFails && hasWarnings && <AlertTriangle className="h-3.5 w-3.5" />}
                    {!hasFails && !hasWarnings && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-1">
                {categoryChecks.map((check) => {
                  const StatusIcon = statusConfig[check.status].icon
                  return (
                    <div
                      key={check.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-3 py-2",
                        check.status === "fail" && "bg-destructive/5",
                        check.status === "warning" && "bg-warning/5",
                      )}
                    >
                      <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", statusConfig[check.status].className)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{check.name}</p>
                        <p className="text-xs text-muted-foreground">{check.description}</p>
                        {check.details && (
                          <p
                            className={cn(
                              "mt-1 text-xs",
                              check.status === "fail" && "text-destructive",
                              check.status === "warning" && "text-warning",
                            )}
                          >
                            {check.details}
                          </p>
                        )}
                      </div>
                      {check.details && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                <Info className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{check.details}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}

        {checks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Validation not yet run</p>
            <Button variant="outline" size="sm" className="mt-4 border-border bg-transparent" onClick={onRevalidate}>
              Run Validation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
