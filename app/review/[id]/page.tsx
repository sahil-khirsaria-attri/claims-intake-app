"use client"

import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { DocumentList } from "@/components/claims/document-list"
import { FieldExtractionPanel } from "@/components/claims/field-extraction-panel"
import { ValidationPanel } from "@/components/claims/validation-panel"
import { AuditLog } from "@/components/claims/audit-log"
import { UploadModal } from "@/components/claims/upload-modal"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { claimsApi } from "@/lib/api/client"
import { ArrowLeft, Send, XCircle, FileUp, RefreshCw, CheckCircle, MessageSquare, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Claim } from "@/lib/types"
import { useSidebar } from "@/lib/context/sidebar-context"

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { collapsed } = useSidebar()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchClaim = useCallback(async () => {
    setIsLoading(true)
    const response = await claimsApi.get(resolvedParams.id)
    if (response.data) {
      setClaim(response.data as Claim)
    }
    setIsLoading(false)
  }, [resolvedParams.id])

  useEffect(() => {
    fetchClaim()
  }, [fetchClaim])

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState("")
  const [isRevalidating, setIsRevalidating] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={cn("transition-all duration-300", collapsed ? "lg:pl-16" : "lg:pl-64")}>
          <div className="p-6 space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64 lg:col-span-2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={cn("transition-all duration-300", collapsed ? "lg:pl-16" : "lg:pl-64")}>
          <div className="flex flex-col items-center justify-center py-24">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">Claim not found</p>
            <Button onClick={() => router.push("/review")} className="mt-4">
              Back to Review Queue
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const failedChecks = claim.validationChecks?.filter((c) => c.status === "fail") || []
  const warningChecks = claim.validationChecks?.filter((c) => c.status === "warning") || []

  const handleRevalidate = async () => {
    setIsRevalidating(true)
    const response = await claimsApi.process(claim.id)
    if (response.error) {
      toast.error("Failed to revalidate claim")
    } else {
      toast.success("Claim revalidated successfully")
      fetchClaim()
    }
    setIsRevalidating(false)
  }

  const handleUpload = (files: File[], type: string) => {
    toast.success(`${files.length} file(s) uploaded as ${type.replace('_', ' ')}`)
    setUploadModalOpen(false)
  }

  const handleMarkComplete = async () => {
    const response = await claimsApi.update(claim.id, { status: "ready_for_submission" })
    if (response.error) {
      toast.error("Failed to mark claim as ready")
    } else {
      toast.success("Claim marked as ready for submission")
      router.push("/review")
    }
  }

  const handleReject = async () => {
    const response = await claimsApi.update(claim.id, { status: "rejected" })
    if (response.error) {
      toast.error("Failed to reject claim")
    } else {
      toast.success("Claim rejected")
      router.push("/review")
    }
    setRejectDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        {/* Header */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link href="/review">
                <Button variant="ghost" size="icon" className="mt-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-foreground">{claim.id}</h1>
                  <StatusBadge status={claim.status} />
                  <StatusBadge status={claim.priority} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Human Review Required • {claim.patientName} • {claim.memberId}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Issues Summary */}
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Review Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {failedChecks.map((check) => (
                  <div key={check.id} className="flex items-start gap-3 rounded-lg bg-background/50 p-3">
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                      {check.details && <p className="mt-1 text-xs text-destructive">{check.details}</p>}
                    </div>
                  </div>
                ))}
                {warningChecks.map((check) => (
                  <div key={check.id} className="flex items-start gap-3 rounded-lg bg-background/50 p-3">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                      {check.details && <p className="mt-1 text-xs text-warning">{check.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-6">
              <DocumentList documents={claim.documents || []} onUpload={() => setUploadModalOpen(true)} />

              {/* Review Actions */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-card-foreground">Review Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full border-border justify-start bg-transparent"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload Missing Documents
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border justify-start bg-transparent"
                    onClick={handleRevalidate}
                    disabled={isRevalidating}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isRevalidating && "animate-spin")} />
                    {isRevalidating ? "Re-validating..." : "Re-run Validation"}
                  </Button>
                </CardContent>
              </Card>

              <AuditLog entries={claim.auditLog || []} />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <FieldExtractionPanel fields={claim.extractedFields || []} />
                <ValidationPanel checks={claim.validationChecks || []} onRevalidate={handleRevalidate} />
              </div>

              {/* Review Notes & Submit */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Review Notes & Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add your review notes, corrections made, or reason for decision..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="bg-input text-foreground placeholder:text-muted-foreground min-h-24"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleMarkComplete}
                      disabled={failedChecks.length > 0}
                      className={failedChecks.length > 0 ? "opacity-50" : ""}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Ready for Submission
                    </Button>
                    <Button variant="outline" className="border-border bg-transparent">
                      <Send className="mr-2 h-4 w-4" />
                      Submit Directly
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                      onClick={() => setRejectDialogOpen(true)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Claim
                    </Button>
                  </div>
                  {failedChecks.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Resolve all failed validations or upload missing documents before marking as ready.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUpload={handleUpload} />

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this claim? This action will mark the claim as rejected and notify the
              submitting party. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
