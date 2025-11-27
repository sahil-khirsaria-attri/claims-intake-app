"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Send, AlertTriangle, FileSearch, XCircle, MessageSquare } from "lucide-react"
import type { ValidationCheck } from "@/lib/types"

type RoutingDecision = "submit" | "exception" | "human_review"

interface RoutingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checks: ValidationCheck[]
  onConfirm: (decision: RoutingDecision, comment?: string) => void
}

const routingOptions = [
  {
    value: "submit" as const,
    label: "Clean Submission",
    description: "Submit claim directly to payer via EDI 837P",
    icon: Send,
    iconClass: "text-success",
    bgClass: "data-[state=checked]:bg-success/10 data-[state=checked]:border-success",
  },
  {
    value: "exception" as const,
    label: "Exception Queue",
    description: "Route to exception queue for further processing",
    icon: AlertTriangle,
    iconClass: "text-warning",
    bgClass: "data-[state=checked]:bg-warning/10 data-[state=checked]:border-warning",
  },
  {
    value: "human_review" as const,
    label: "Human Review",
    description: "Assign to a human reviewer for manual review",
    icon: FileSearch,
    iconClass: "text-chart-1",
    bgClass: "data-[state=checked]:bg-chart-1/10 data-[state=checked]:border-chart-1",
  },
]

export function RoutingModal({ open, onOpenChange, checks, onConfirm }: RoutingModalProps) {
  const [decision, setDecision] = useState<RoutingDecision>("submit")
  const [comment, setComment] = useState("")

  const failedChecks = checks.filter((c) => c.status === "fail")
  const warningChecks = checks.filter((c) => c.status === "warning")

  // Recommend routing based on validation results
  const recommendedDecision: RoutingDecision =
    failedChecks.length > 0 ? "human_review" : warningChecks.length > 0 ? "exception" : "submit"

  const handleConfirm = () => {
    onConfirm(decision, comment || undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Routing Decision</DialogTitle>
          <DialogDescription>Choose how to route this claim based on validation results</DialogDescription>
        </DialogHeader>

        {/* Validation Summary */}
        {(failedChecks.length > 0 || warningChecks.length > 0) && (
          <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">Validation Issues</p>
            {failedChecks.length > 0 && (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-destructive font-medium">{failedChecks.length} failed check(s)</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {failedChecks.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        • {c.name}: {c.details || c.description}
                      </li>
                    ))}
                    {failedChecks.length > 3 && <li>• and {failedChecks.length - 3} more...</li>}
                  </ul>
                </div>
              </div>
            )}
            {warningChecks.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-warning font-medium">{warningChecks.length} warning(s)</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {warningChecks.slice(0, 2).map((c) => (
                      <li key={c.id}>
                        • {c.name}: {c.details || c.description}
                      </li>
                    ))}
                    {warningChecks.length > 2 && <li>• and {warningChecks.length - 2} more...</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Routing Options */}
        <div className="space-y-3">
          <Label className="text-foreground">Select Routing</Label>
          <RadioGroup value={decision} onValueChange={(v) => setDecision(v as RoutingDecision)}>
            {routingOptions.map((option) => {
              const Icon = option.icon
              const isRecommended = option.value === recommendedDecision
              const isDisabled = option.value === "submit" && failedChecks.length > 0

              return (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                    disabled={isDisabled}
                  />
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer transition-all",
                      "hover:bg-secondary/50",
                      option.bgClass,
                      isDisabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", option.iconClass)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                        {isRecommended && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment" className="text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Add Comment (Optional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Add any notes or reason for this routing decision..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-input text-foreground placeholder:text-muted-foreground resize-none"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {decision === "submit" && (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Claim
              </>
            )}
            {decision === "exception" && (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Send to Exception
              </>
            )}
            {decision === "human_review" && (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                Send to Review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
