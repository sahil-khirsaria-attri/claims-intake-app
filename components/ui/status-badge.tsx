import { cn } from "@/lib/utils"
import type { ClaimStatus, ValidationStatus, Priority } from "@/lib/types"

interface StatusBadgeProps {
  status: ClaimStatus | ValidationStatus | Priority
  size?: "sm" | "md"
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Claim statuses
  new: { label: "New", className: "bg-chart-1/20 text-chart-1 border-chart-1/30" },
  processing: { label: "Processing", className: "bg-chart-5/20 text-chart-5 border-chart-5/30" },
  validation_pending: { label: "Validation Pending", className: "bg-warning/20 text-warning border-warning/30" },
  validation_complete: { label: "Validated", className: "bg-success/20 text-success border-success/30" },
  exception: { label: "Exception", className: "bg-destructive/20 text-destructive border-destructive/30" },
  human_review: { label: "Human Review", className: "bg-warning/20 text-warning border-warning/30" },
  ready_for_submission: { label: "Ready", className: "bg-success/20 text-success border-success/30" },
  submitted: { label: "Submitted", className: "bg-success/20 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-destructive/20 text-destructive border-destructive/30" },
  // Validation statuses
  pass: { label: "Pass", className: "bg-success/20 text-success border-success/30" },
  warning: { label: "Warning", className: "bg-warning/20 text-warning border-warning/30" },
  fail: { label: "Fail", className: "bg-destructive/20 text-destructive border-destructive/30" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  // Priority
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Medium", className: "bg-chart-1/20 text-chart-1 border-chart-1/30" },
  high: { label: "High", className: "bg-warning/20 text-warning border-warning/30" },
  urgent: { label: "Urgent", className: "bg-destructive/20 text-destructive border-destructive/30" },
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
