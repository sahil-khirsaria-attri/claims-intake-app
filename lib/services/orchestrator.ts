import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import rabbitmq, { QUEUES, QueueMessage } from "@/lib/queue/rabbitmq"
import tesseract from "@/lib/ocr/tesseract"
import azureOpenAI from "@/lib/ai/azure-openai"
import rulesEngine from "@/lib/rules/engine"
import { ExtractedField } from "@/lib/types"

export interface WorkflowStage {
  name: string
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped"
  startedAt?: Date
  completedAt?: Date
  error?: string
  result?: Record<string, unknown>
}

export interface ClaimWorkflow {
  claimId: string
  currentStage: string
  stages: WorkflowStage[]
  startedAt: Date
  completedAt?: Date
  status: "running" | "completed" | "failed" | "paused"
}

// Workflow stage definitions
const WORKFLOW_STAGES = [
  "intake",
  "document_processing",
  "ocr_extraction",
  "ai_field_extraction",
  "eligibility_check",
  "code_validation",
  "business_rules",
  "document_check",
  "routing_decision",
  "submission",
] as const

type WorkflowStageName = (typeof WORKFLOW_STAGES)[number]

class ClaimsOrchestrator {
  private activeWorkflows: Map<string, ClaimWorkflow> = new Map()

  async startWorkflow(claimId: string): Promise<ClaimWorkflow> {
    // Check if workflow already exists
    if (this.activeWorkflows.has(claimId)) {
      return this.activeWorkflows.get(claimId)!
    }

    // Get claim
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { documents: true },
    })

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`)
    }

    // Initialize workflow
    const workflow: ClaimWorkflow = {
      claimId,
      currentStage: "intake",
      stages: WORKFLOW_STAGES.map((name) => ({
        name,
        status: name === "intake" ? "in_progress" : "pending",
      })),
      startedAt: new Date(),
      status: "running",
    }

    this.activeWorkflows.set(claimId, workflow)

    // Start processing
    await this.executeStage(workflow, "intake")

    return workflow
  }

  async executeStage(workflow: ClaimWorkflow, stageName: WorkflowStageName): Promise<void> {
    const stage = workflow.stages.find((s) => s.name === stageName)
    if (!stage) return

    stage.status = "in_progress"
    stage.startedAt = new Date()
    workflow.currentStage = stageName

    try {
      switch (stageName) {
        case "intake":
          await this.processIntake(workflow)
          break
        case "document_processing":
          await this.processDocuments(workflow)
          break
        case "ocr_extraction":
          await this.processOCR(workflow)
          break
        case "ai_field_extraction":
          await this.processAIExtraction(workflow)
          break
        case "eligibility_check":
          await this.processEligibility(workflow)
          break
        case "code_validation":
          await this.processCodeValidation(workflow)
          break
        case "business_rules":
          await this.processBusinessRules(workflow)
          break
        case "document_check":
          await this.processDocumentCheck(workflow)
          break
        case "routing_decision":
          await this.processRouting(workflow)
          break
        case "submission":
          await this.processSubmission(workflow)
          break
      }

      stage.status = "completed"
      stage.completedAt = new Date()

      // Move to next stage
      const currentIndex = WORKFLOW_STAGES.indexOf(stageName)
      if (currentIndex < WORKFLOW_STAGES.length - 1) {
        const nextStage = WORKFLOW_STAGES[currentIndex + 1]
        await this.executeStage(workflow, nextStage)
      } else {
        workflow.status = "completed"
        workflow.completedAt = new Date()
      }
    } catch (error) {
      stage.status = "failed"
      stage.error = error instanceof Error ? error.message : "Unknown error"
      workflow.status = "failed"

      // Log error
      await this.logWorkflowError(workflow, stageName, error)
    }
  }

  private async processIntake(workflow: ClaimWorkflow): Promise<void> {
    await prisma.claim.update({
      where: { id: workflow.claimId },
      data: { status: "processing" },
    })

    await this.addAuditLog(workflow.claimId, "Intake completed", "Claim received and workflow started")
  }

  private async processDocuments(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { documents: true },
    })

    if (!claim?.documents.length) {
      const stage = workflow.stages.find((s) => s.name === "document_processing")
      if (stage) {
        stage.status = "skipped"
        stage.result = { message: "No documents to process" }
      }
      return
    }

    // Queue document processing jobs
    for (const doc of claim.documents) {
      if (doc.ocrStatus === "pending") {
        await rabbitmq.publish(QUEUES.OCR_PROCESSING, {
          type: QUEUES.OCR_PROCESSING,
          payload: { claimId: workflow.claimId, documentId: doc.id },
          claimId: workflow.claimId,
        })
      }
    }

    await this.addAuditLog(
      workflow.claimId,
      "Document processing started",
      `${claim.documents.length} document(s) queued for processing`
    )
  }

  private async processOCR(workflow: ClaimWorkflow): Promise<void> {
    const documents = await prisma.document.findMany({
      where: { claimId: workflow.claimId, ocrStatus: "pending" },
    })

    for (const doc of documents) {
      try {
        await prisma.document.update({
          where: { id: doc.id },
          data: { ocrStatus: "processing" },
        })

        const ocrResult = await tesseract.processImage(doc.url)
        const quality = await tesseract.assessQuality(doc.url)
        const docType = await tesseract.detectFormType(doc.url)

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            ocrStatus: "complete",
            rawOcrText: ocrResult.text,
            qualityScore: quality.score,
            classificationConfidence: docType.confidence,
            type: docType.type as "cms_1500" | "ub_04" | "operative_notes" | "h_and_p" | "prior_auth" | "referral" | "medical_records" | "other",
            processedAt: new Date(),
          },
        })
      } catch (error) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { ocrStatus: "failed" },
        })
        throw error
      }
    }

    await this.addAuditLog(
      workflow.claimId,
      "OCR extraction completed",
      `${documents.length} document(s) processed`
    )
  }

  private async processAIExtraction(workflow: ClaimWorkflow): Promise<void> {
    const documents = await prisma.document.findMany({
      where: { claimId: workflow.claimId, ocrStatus: "complete" },
    })

    const allFields: { documentId: string; fields: ExtractedField[] }[] = []

    for (const doc of documents) {
      if (!doc.rawOcrText) continue

      try {
        const result = await azureOpenAI.extractFields(doc.rawOcrText, doc.type)

        // Save extracted fields
        for (const field of result.fields) {
          await prisma.extractedField.create({
            data: {
              claimId: workflow.claimId,
              documentId: doc.id,
              category: field.category as "patient" | "provider" | "claim" | "codes",
              label: field.label,
              value: field.value,
              confidence: field.confidence,
            },
          })
        }

        allFields.push({
          documentId: doc.id,
          fields: result.fields.map((f) => ({
            id: "",
            ...f,
            isEdited: false,
          })),
        })
      } catch (error) {
        console.error(`AI extraction failed for document ${doc.id}:`, error)
      }
    }

    // Update claim with patient info
    const allExtractedFields = allFields.flatMap((d) => d.fields)
    const patientName = allExtractedFields.find((f) => f.label === "Patient Name")?.value
    const memberId = allExtractedFields.find((f) => f.label === "Member ID")?.value
    const avgConfidence =
      allExtractedFields.length > 0
        ? allExtractedFields.reduce((sum, f) => sum + f.confidence, 0) / allExtractedFields.length
        : 0

    await prisma.claim.update({
      where: { id: workflow.claimId },
      data: {
        patientName,
        memberId,
        confidenceScore: avgConfidence,
        status: "validation_pending",
      },
    })

    await this.addAuditLog(
      workflow.claimId,
      "AI field extraction completed",
      `${allExtractedFields.length} fields extracted with ${avgConfidence.toFixed(1)}% avg confidence`
    )
  }

  private async processEligibility(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { extractedFields: true },
    })

    if (!claim) return

    const fields = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    const results = rulesEngine.executeByCategory({ fields }, "eligibility")

    for (const result of results) {
      await prisma.validationCheck.create({
        data: {
          claimId: workflow.claimId,
          category: "eligibility",
          name: result.validationCheck.name,
          description: result.validationCheck.description,
          status: result.validationCheck.status as "pass" | "warning" | "fail" | "pending",
          details: result.validationCheck.details,
          ruleId: result.ruleId,
          executedAt: new Date(),
        },
      })
    }

    await this.addAuditLog(
      workflow.claimId,
      "Eligibility check completed",
      `${results.length} rules executed`
    )
  }

  private async processCodeValidation(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { extractedFields: true },
    })

    if (!claim) return

    const fields = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    const results = rulesEngine.executeByCategory({ fields }, "code")

    for (const result of results) {
      await prisma.validationCheck.create({
        data: {
          claimId: workflow.claimId,
          category: "code",
          name: result.validationCheck.name,
          description: result.validationCheck.description,
          status: result.validationCheck.status as "pass" | "warning" | "fail" | "pending",
          details: result.validationCheck.details,
          ruleId: result.ruleId,
          executedAt: new Date(),
        },
      })
    }

    await this.addAuditLog(
      workflow.claimId,
      "Code validation completed",
      `${results.length} rules executed`
    )
  }

  private async processBusinessRules(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { extractedFields: true },
    })

    if (!claim) return

    const fields = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    const results = rulesEngine.executeByCategory(
      { fields, claimAmount: claim.totalAmount ?? undefined },
      "business_rule"
    )

    for (const result of results) {
      await prisma.validationCheck.create({
        data: {
          claimId: workflow.claimId,
          category: "business_rule",
          name: result.validationCheck.name,
          description: result.validationCheck.description,
          status: result.validationCheck.status as "pass" | "warning" | "fail" | "pending",
          details: result.validationCheck.details,
          ruleId: result.ruleId,
          executedAt: new Date(),
        },
      })
    }

    await this.addAuditLog(
      workflow.claimId,
      "Business rules validation completed",
      `${results.length} rules executed`
    )
  }

  private async processDocumentCheck(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { extractedFields: true, documents: true },
    })

    if (!claim) return

    const fields = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    const avgQuality =
      claim.documents.length > 0
        ? claim.documents.reduce((sum, d) => sum + d.qualityScore, 0) / claim.documents.length
        : 0

    const results = rulesEngine.executeByCategory(
      {
        fields,
        metadata: {
          qualityScore: avgQuality,
          hasOperativeNotes: claim.documents.some((d) => d.type === "operative_notes").toString(),
        },
      },
      "document"
    )

    for (const result of results) {
      await prisma.validationCheck.create({
        data: {
          claimId: workflow.claimId,
          category: "document",
          name: result.validationCheck.name,
          description: result.validationCheck.description,
          status: result.validationCheck.status as "pass" | "warning" | "fail" | "pending",
          details: result.validationCheck.details,
          ruleId: result.ruleId,
          executedAt: new Date(),
        },
      })
    }

    await this.addAuditLog(
      workflow.claimId,
      "Document check completed",
      `${results.length} rules executed`
    )
  }

  private async processRouting(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { validationChecks: true },
    })

    if (!claim) return

    const hasFailed = claim.validationChecks.some((c) => c.status === "fail")
    const hasWarning = claim.validationChecks.some((c) => c.status === "warning")

    let newStatus: "exception" | "human_review" | "validation_complete" | "ready_for_submission"

    if (hasFailed) {
      newStatus = "exception"
    } else if (hasWarning) {
      newStatus = "human_review"
    } else {
      newStatus = "ready_for_submission"
    }

    await prisma.claim.update({
      where: { id: workflow.claimId },
      data: { status: newStatus },
    })

    const stage = workflow.stages.find((s) => s.name === "routing_decision")
    if (stage) {
      stage.result = { decision: newStatus }
    }

    await this.addAuditLog(
      workflow.claimId,
      "Routing decision made",
      `Claim routed to: ${newStatus}`
    )

    // If not ready for submission, stop workflow
    if (newStatus !== "ready_for_submission") {
      const submissionStage = workflow.stages.find((s) => s.name === "submission")
      if (submissionStage) {
        submissionStage.status = "skipped"
        submissionStage.result = { reason: `Routed to ${newStatus}` }
      }
      workflow.status = "completed"
      workflow.completedAt = new Date()
    }
  }

  private async processSubmission(workflow: ClaimWorkflow): Promise<void> {
    const claim = await prisma.claim.findUnique({
      where: { id: workflow.claimId },
      include: { extractedFields: true },
    })

    if (!claim) return

    // Generate EDI
    const fields = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    let ediContent: string
    try {
      ediContent = await azureOpenAI.generateEDI837(fields)
    } catch {
      ediContent = "EDI generation failed"
    }

    const confirmationNumber = `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    await prisma.claim.update({
      where: { id: workflow.claimId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        confirmationNumber,
        ediContent,
      },
    })

    // Create payer tracking
    await prisma.payerTracking.create({
      data: {
        claimId: workflow.claimId,
        status: "pending",
        payerName: claim.extractedFields.find((f) => f.label === "Payer Name")?.value || "Unknown",
        payerId: claim.extractedFields.find((f) => f.label === "Payer ID")?.value || "UNKNOWN",
        trackingEvents: {
          create: {
            status: "submitted",
            description: "Claim submitted to payer",
          },
        },
      },
    })

    await this.addAuditLog(
      workflow.claimId,
      "Claim submitted",
      `Confirmation #: ${confirmationNumber}`
    )

    // Invalidate cache
    await cache.del(cache.claimKey(workflow.claimId))
    await cache.invalidatePattern("claims:list:*")
  }

  private async addAuditLog(claimId: string, action: string, details: string): Promise<void> {
    await prisma.auditLogEntry.create({
      data: {
        claimId,
        userId: "system",
        action,
        details,
      },
    })
  }

  private async logWorkflowError(
    workflow: ClaimWorkflow,
    stageName: string,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await this.addAuditLog(
      workflow.claimId,
      `Workflow error at ${stageName}`,
      errorMessage
    )
  }

  getWorkflow(claimId: string): ClaimWorkflow | undefined {
    return this.activeWorkflows.get(claimId)
  }

  async pauseWorkflow(claimId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(claimId)
    if (workflow) {
      workflow.status = "paused"
      await this.addAuditLog(claimId, "Workflow paused", "Manual pause requested")
    }
  }

  async resumeWorkflow(claimId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(claimId)
    if (workflow && workflow.status === "paused") {
      workflow.status = "running"
      await this.addAuditLog(claimId, "Workflow resumed", "Manual resume requested")

      // Find current stage and continue
      const currentStageIndex = WORKFLOW_STAGES.indexOf(workflow.currentStage as WorkflowStageName)
      if (currentStageIndex >= 0 && currentStageIndex < WORKFLOW_STAGES.length - 1) {
        const nextStage = WORKFLOW_STAGES[currentStageIndex + 1]
        await this.executeStage(workflow, nextStage)
      }
    }
  }
}

// Singleton instance
const globalForOrchestrator = globalThis as unknown as {
  orchestrator: ClaimsOrchestrator | undefined
}

export const orchestrator = globalForOrchestrator.orchestrator ?? new ClaimsOrchestrator()

if (process.env.NODE_ENV !== "production") globalForOrchestrator.orchestrator = orchestrator

export default orchestrator
