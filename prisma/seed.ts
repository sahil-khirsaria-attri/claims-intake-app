import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "sarah.johnson@claimsai.com" },
    update: {},
    create: {
      email: "sarah.johnson@claimsai.com",
      password: hashedPassword,
      name: "Sarah Johnson",
      role: "admin",
    },
  })

  const reviewer = await prisma.user.upsert({
    where: { email: "michael.chen@claimsai.com" },
    update: {},
    create: {
      email: "michael.chen@claimsai.com",
      password: hashedPassword,
      name: "Michael Chen",
      role: "human_reviewer",
    },
  })

  const specialist = await prisma.user.upsert({
    where: { email: "emily.davis@claimsai.com" },
    update: {},
    create: {
      email: "emily.davis@claimsai.com",
      password: hashedPassword,
      name: "Emily Davis",
      role: "validation_specialist",
    },
  })

  const clerk = await prisma.user.upsert({
    where: { email: "robert.wilson@claimsai.com" },
    update: {},
    create: {
      email: "robert.wilson@claimsai.com",
      password: hashedPassword,
      name: "Robert Wilson",
      role: "intake_clerk",
    },
  })

  console.log("Created users:", { admin, reviewer, specialist, clerk })

  // Create sample claims
  const claims = await Promise.all([
    prisma.claim.create({
      data: {
        submissionChannel: "portal",
        status: "validation_complete",
        priority: "high",
        confidenceScore: 94,
        patientName: "John Martinez",
        memberId: "MBR-789456123",
        totalAmount: 2450.0,
        assigneeId: admin.id,
        documents: {
          create: [
            {
              name: "CMS-1500_claim_form.pdf",
              type: "cms_1500",
              url: "/uploads/cms-1500.pdf",
              ocrStatus: "complete",
              classificationConfidence: 98,
              qualityScore: 95,
            },
          ],
        },
        extractedFields: {
          create: [
            { category: "patient", label: "Patient Name", value: "John Martinez", confidence: 98 },
            { category: "patient", label: "Date of Birth", value: "1985-03-15", confidence: 96 },
            { category: "patient", label: "Member ID", value: "MBR-789456123", confidence: 99 },
            { category: "provider", label: "Provider NPI", value: "1234567890", confidence: 97 },
            { category: "claim", label: "Service Date", value: "2024-01-10", confidence: 95 },
            { category: "codes", label: "CPT Code", value: "99213", confidence: 94 },
          ],
        },
        validationChecks: {
          create: [
            { category: "eligibility", name: "Member Eligibility", description: "Verify member is active", status: "pass", details: "Member is active" },
            { category: "code", name: "Valid NPI", description: "Verify provider NPI", status: "pass", details: "NPI verified" },
          ],
        },
        auditLog: {
          create: [
            { action: "Claim created", userId: admin.id },
            { action: "OCR completed", userId: admin.id },
            { action: "Validation passed", userId: admin.id },
          ],
        },
      },
    }),
    prisma.claim.create({
      data: {
        submissionChannel: "email",
        status: "exception",
        priority: "urgent",
        confidenceScore: 72,
        patientName: "Maria Garcia",
        memberId: "MBR-456789012",
        totalAmount: 8750.0,
        documents: {
          create: [
            {
              name: "UB-04_form.pdf",
              type: "ub_04",
              url: "/uploads/ub-04.pdf",
              ocrStatus: "complete",
              classificationConfidence: 85,
              qualityScore: 70,
            },
          ],
        },
        validationChecks: {
          create: [
            { category: "eligibility", name: "Member Eligibility", description: "Verify member is active", status: "pass" },
            { category: "code", name: "Code Bundling", description: "Check for bundled codes", status: "fail", details: "CPT codes 99213 and 99214 cannot be billed together" },
          ],
        },
        auditLog: {
          create: [
            { action: "Claim created", userId: clerk.id },
            { action: "Validation failed", userId: clerk.id },
          ],
        },
      },
    }),
    prisma.claim.create({
      data: {
        submissionChannel: "fax",
        status: "human_review",
        priority: "high",
        confidenceScore: 65,
        patientName: "Robert Johnson",
        memberId: "MBR-321654987",
        totalAmount: 1250.0,
        assigneeId: reviewer.id,
        documents: {
          create: [
            {
              name: "medical_records.pdf",
              type: "medical_records",
              url: "/uploads/medical-records.pdf",
              ocrStatus: "complete",
              classificationConfidence: 75,
              qualityScore: 60,
            },
          ],
        },
        validationChecks: {
          create: [
            { category: "document", name: "Document Quality", description: "Check document quality", status: "warning", details: "Quality score 60% below threshold" },
          ],
        },
        auditLog: {
          create: [
            { action: "Claim created", userId: clerk.id },
            { action: "Routed to human review", userId: clerk.id },
          ],
        },
      },
    }),
    prisma.claim.create({
      data: {
        submissionChannel: "portal",
        status: "new",
        priority: "medium",
        confidenceScore: 0,
        patientName: "Sarah Williams",
        memberId: "MBR-147258369",
        totalAmount: 550.0,
        auditLog: {
          create: [
            { action: "Claim created", userId: clerk.id },
          ],
        },
      },
    }),
    prisma.claim.create({
      data: {
        submissionChannel: "edi",
        status: "submitted",
        priority: "low",
        confidenceScore: 98,
        patientName: "James Brown",
        memberId: "MBR-963852741",
        totalAmount: 320.0,
        confirmationNumber: "CONF-2024-001234",
        submittedAt: new Date(),
        assigneeId: specialist.id,
        payerTracking: {
          create: {
            payerName: "Blue Cross Blue Shield",
            payerId: "BCBS-001",
            status: "accepted",
            trackingEvents: {
              create: [
                { status: "submitted", description: "Claim submitted to payer" },
                { status: "accepted", description: "Claim accepted by payer" },
              ],
            },
          },
        },
        auditLog: {
          create: [
            { action: "Claim created", userId: specialist.id },
            { action: "Claim submitted", userId: specialist.id },
          ],
        },
      },
    }),
  ])

  console.log("Created claims:", claims.length)

  // Create business rules
  await prisma.businessRule.createMany({
    data: [
      {
        name: "member_eligibility",
        description: "Check if member is eligible for coverage",
        category: "eligibility",
        condition: { field: "memberId", operator: "exists" },
        action: { type: "validate", message: "Member ID is required" },
        priority: 100,
      },
      {
        name: "valid_npi",
        description: "Validate provider NPI format",
        category: "code",
        condition: { field: "providerNpi", operator: "matches", value: "^[0-9]{10}$" },
        action: { type: "validate", message: "Invalid NPI format" },
        priority: 90,
      },
      {
        name: "document_quality",
        description: "Check document quality score",
        category: "document",
        condition: { field: "qualityScore", operator: "gte", value: 70 },
        action: { type: "warning", message: "Document quality below threshold" },
        priority: 80,
      },
    ],
    skipDuplicates: true,
  })

  console.log("Created business rules")

  // Create system config
  await prisma.systemConfig.upsert({
    where: { key: "processing_settings" },
    update: {},
    create: {
      key: "processing_settings",
      value: {
        autoProcessEnabled: true,
        confidenceThreshold: 85,
        qualityThreshold: 70,
        maxRetries: 3,
      },
    },
  })

  console.log("Created system config")
  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
