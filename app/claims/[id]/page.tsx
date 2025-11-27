"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { ClaimHeader } from "@/components/claims/claim-header"
import { DocumentList } from "@/components/claims/document-list"
import { FieldExtractionPanel } from "@/components/claims/field-extraction-panel"
import { ValidationPanel } from "@/components/claims/validation-panel"
import { AuditLog } from "@/components/claims/audit-log"
import { RoutingModal } from "@/components/claims/routing-modal"
import { UploadModal } from "@/components/claims/upload-modal"
import { AIExceptionPanel } from "@/components/claims/ai-exception-panel"
import { AIReviewPanel } from "@/components/claims/ai-review-panel"
import { claimsApi, documentsApi, fieldsApi } from "@/lib/api/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Send, AlertTriangle, FileSearch, RotateCcw, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Claim } from "@/lib/types"
import { useSidebar } from "@/lib/context/sidebar-context"
import { cn } from "@/lib/utils"

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
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

  const [routingModalOpen, setRoutingModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcessClaim = async () => {
    if (!claim) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/claims/${claim.id}/process`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || data.error || "Failed to process claim")
        return
      }

      // Show routing result
      const routingQueue = data.routing?.queue
      if (routingQueue === "CLEAN_SUBMISSION") {
        toast.success("Claim passed all validations! Ready for submission.")
      } else if (routingQueue === "EXCEPTION_QUEUE") {
        toast.warning("Claim has minor issues that can be auto-corrected.")
      } else if (routingQueue === "HUMAN_REVIEW") {
        toast.warning(`Claim requires review: ${data.routing?.reason}`)
      }

      // Refresh the claim to show updated validation results
      fetchClaim()
    } catch (error) {
      toast.error("Failed to process claim")
      console.error("Process claim error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

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
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const hasFailedValidations = claim.validationChecks?.some((c) => c.status === "fail") || false
  const hasWarnings = claim.validationChecks?.some((c) => c.status === "warning") || false

  const handleRouting = async (decision: "submit" | "exception" | "human_review", comment?: string) => {
    const statusMap = {
      submit: "submitted",
      exception: "exception",
      human_review: "human_review"
    } as const
    const messages = {
      submit: "Claim submitted successfully",
      exception: "Claim sent to exception queue",
      human_review: "Claim sent for human review"
    }

    const response = await claimsApi.update(claim.id, { status: statusMap[decision] })
    if (response.error) {
      toast.error("Failed to route claim")
      return
    }

    toast.success(messages[decision])
    setRoutingModalOpen(false)
    // Navigate based on decision
    if (decision === "submit") {
      router.push("/submissions")
    } else if (decision === "exception") {
      router.push("/exceptions")
    } else {
      router.push("/review")
    }
  }

  const handleUpload = async (files: File[], type: string) => {
    if (!claim) return

    let uploadedCount = 0
    let failedCount = 0

    for (const file of files) {
      const result = await documentsApi.upload(claim.id, file, type)
      if (result.error) {
        failedCount++
        console.error(`Failed to upload ${file.name}:`, result.error)
      } else {
        uploadedCount++
      }
    }

    setUploadModalOpen(false)

    if (failedCount > 0 && uploadedCount > 0) {
      toast.warning(`${uploadedCount} file(s) uploaded, ${failedCount} failed`)
    } else if (failedCount > 0) {
      toast.error(`Failed to upload ${failedCount} file(s)`)
    } else {
      toast.success(`${uploadedCount} file(s) uploaded successfully`)
    }

    // Refresh the claim to show new documents
    fetchClaim()
  }

  const handleFieldUpdate = async (id: string, value: string) => {
    const result = await fieldsApi.update(id, value)
    if (result.error) {
      toast.error("Failed to update field")
    } else {
      toast.success("Field updated")
      fetchClaim()
    }
  }

  const handleRevalidate = async () => {
    if (!claim) return

    setIsProcessing(true)
    try {
      const response = await claimsApi.validate(claim.id)
      if (response.error) {
        toast.error("Failed to validate claim")
      } else {
        toast.success("Validation complete")
        fetchClaim()
      }
    } catch (error) {
      toast.error("Failed to validate claim")
      console.error("Validate claim error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <ClaimHeader claim={claim} />

        <div className="p-6">
          {/* Action Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {hasFailedValidations ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Issues require attention before submission</span>
                </div>
              ) : hasWarnings ? (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Review recommended before submission</span>
                </div>
              ) : (claim.validationChecks?.length || 0) > 0 ? (
                <div className="flex items-center gap-2 text-success">
                  <Send className="h-5 w-5" />
                  <span className="font-medium">Ready for clean submission</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RotateCcw className="h-5 w-5" />
                  <span className="font-medium">Processing in progress</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Process Claim Button - runs validation pipeline */}
              <Button
                variant="outline"
                className="border-border bg-transparent"
                onClick={handleProcessClaim}
                disabled={isProcessing || (claim.documents?.length || 0) === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Process Claim
                  </>
                )}
              </Button>
              {hasFailedValidations && (
                <Button
                  variant="outline"
                  className="border-border bg-transparent"
                  onClick={() => setRoutingModalOpen(true)}
                >
                  <FileSearch className="mr-2 h-4 w-4" />
                  Route Claim
                </Button>
              )}
              <Button onClick={() => setRoutingModalOpen(true)} disabled={(claim.validationChecks?.length || 0) === 0}>
                <Send className="mr-2 h-4 w-4" />
                {hasFailedValidations ? "Review & Submit" : "Submit Claim"}
              </Button>
            </div>
          </div>

          {/* AI Assistant Panel - Shows when there are validation issues or for review */}
          {(hasFailedValidations || hasWarnings || claim.status === "human_review") && (
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <AIExceptionPanel claimId={claim.id} hasFailures={hasFailedValidations || hasWarnings} />
              <AIReviewPanel claimId={claim.id} />
            </div>
          )}

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Documents */}
            <div className="lg:col-span-1 space-y-6">
              <DocumentList documents={claim.documents || []} onUpload={() => setUploadModalOpen(true)} onDocumentDeleted={fetchClaim} />
              <AuditLog entries={claim.auditLog || []} />
            </div>

            {/* Right Column - Fields & Validation */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="fields" className="w-full">
                <TabsList className="bg-secondary mb-4">
                  <TabsTrigger value="fields" className="data-[state=active]:bg-background">
                    Extracted Fields
                  </TabsTrigger>
                  <TabsTrigger value="validation" className="data-[state=active]:bg-background">
                    Validation
                    {hasFailedValidations && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                        {claim.validationChecks?.filter((c) => c.status === "fail").length || 0}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="fields">
                  <FieldExtractionPanel fields={claim.extractedFields || []} onFieldUpdate={handleFieldUpdate} />
                </TabsContent>
                <TabsContent value="validation">
                  <ValidationPanel checks={claim.validationChecks || []} onRevalidate={handleRevalidate} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <RoutingModal
        open={routingModalOpen}
        onOpenChange={setRoutingModalOpen}
        checks={claim.validationChecks || []}
        onConfirm={handleRouting}
      />
      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUpload={handleUpload} />
    </div>
  )
}
