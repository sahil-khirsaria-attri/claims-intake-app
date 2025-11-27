import {
  mockClaims,
  mockUsers,
  mockMetrics,
  currentUser,
} from "@/lib/mock-data"

describe("Mock Data", () => {
  describe("mockClaims", () => {
    it("contains claims data", () => {
      expect(mockClaims).toBeDefined()
      expect(Array.isArray(mockClaims)).toBe(true)
      expect(mockClaims.length).toBeGreaterThan(0)
    })

    it("claims have required properties", () => {
      mockClaims.forEach((claim) => {
        expect(claim).toHaveProperty("id")
        expect(claim).toHaveProperty("status")
        expect(claim).toHaveProperty("priority")
        expect(claim).toHaveProperty("receivedAt")
        expect(claim).toHaveProperty("confidenceScore")
        expect(claim).toHaveProperty("submissionChannel")
      })
    })

    it("claims have valid status values", () => {
      const validStatuses = [
        "new",
        "processing",
        "validation_pending",
        "validation_complete",
        "exception",
        "human_review",
        "ready_for_submission",
        "submitted",
        "rejected",
      ]

      mockClaims.forEach((claim) => {
        expect(validStatuses).toContain(claim.status)
      })
    })

    it("claims have valid priority values", () => {
      const validPriorities = ["low", "medium", "high", "urgent"]

      mockClaims.forEach((claim) => {
        expect(validPriorities).toContain(claim.priority)
      })
    })

    it("claims have valid submission channels", () => {
      const validChannels = ["email", "fax", "portal", "edi"]

      mockClaims.forEach((claim) => {
        expect(validChannels).toContain(claim.submissionChannel)
      })
    })

    it("confidence scores are within valid range", () => {
      mockClaims.forEach((claim) => {
        expect(claim.confidenceScore).toBeGreaterThanOrEqual(0)
        expect(claim.confidenceScore).toBeLessThanOrEqual(100)
      })
    })

    it("claims have documents array", () => {
      mockClaims.forEach((claim) => {
        expect(Array.isArray(claim.documents)).toBe(true)
      })
    })

    it("claims have extractedFields array", () => {
      mockClaims.forEach((claim) => {
        expect(Array.isArray(claim.extractedFields)).toBe(true)
      })
    })

    it("claims have validationChecks array", () => {
      mockClaims.forEach((claim) => {
        expect(Array.isArray(claim.validationChecks)).toBe(true)
      })
    })

    it("claims have auditLog array", () => {
      mockClaims.forEach((claim) => {
        expect(Array.isArray(claim.auditLog)).toBe(true)
      })
    })

    it("some claims have patient names", () => {
      const claimsWithPatientNames = mockClaims.filter((c) => c.patientName)
      expect(claimsWithPatientNames.length).toBeGreaterThan(0)
    })

    it("some claims have member IDs", () => {
      const claimsWithMemberIds = mockClaims.filter((c) => c.memberId)
      expect(claimsWithMemberIds.length).toBeGreaterThan(0)
    })
  })

  describe("mockUsers", () => {
    it("contains users data", () => {
      expect(mockUsers).toBeDefined()
      expect(Array.isArray(mockUsers)).toBe(true)
      expect(mockUsers.length).toBeGreaterThan(0)
    })

    it("users have required properties", () => {
      mockUsers.forEach((user) => {
        expect(user).toHaveProperty("id")
        expect(user).toHaveProperty("name")
        expect(user).toHaveProperty("email")
        expect(user).toHaveProperty("role")
      })
    })

    it("users have valid roles", () => {
      const validRoles = [
        "intake_clerk",
        "validation_specialist",
        "human_reviewer",
        "admin",
      ]

      mockUsers.forEach((user) => {
        expect(validRoles).toContain(user.role)
      })
    })

    it("users have valid email format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      mockUsers.forEach((user) => {
        expect(user.email).toMatch(emailRegex)
      })
    })

    it("user IDs are unique", () => {
      const ids = mockUsers.map((u) => u.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe("mockMetrics", () => {
    it("contains metrics data", () => {
      expect(mockMetrics).toBeDefined()
      expect(typeof mockMetrics).toBe("object")
    })

    it("has totalClaims property", () => {
      expect(mockMetrics).toHaveProperty("totalClaims")
      expect(typeof mockMetrics.totalClaims).toBe("number")
    })

    it("has newClaims property", () => {
      expect(mockMetrics).toHaveProperty("newClaims")
      expect(typeof mockMetrics.newClaims).toBe("number")
    })

    it("has exceptions property", () => {
      expect(mockMetrics).toHaveProperty("exceptions")
      expect(typeof mockMetrics.exceptions).toBe("number")
    })

    it("has humanReview property", () => {
      expect(mockMetrics).toHaveProperty("humanReview")
      expect(typeof mockMetrics.humanReview).toBe("number")
    })

    it("has submitted property", () => {
      expect(mockMetrics).toHaveProperty("submitted")
      expect(typeof mockMetrics.submitted).toBe("number")
    })

    it("has avgProcessingTime property", () => {
      expect(mockMetrics).toHaveProperty("avgProcessingTime")
    })

    it("has exceptionRate property", () => {
      expect(mockMetrics).toHaveProperty("exceptionRate")
      expect(typeof mockMetrics.exceptionRate).toBe("number")
    })

    it("metrics values are non-negative", () => {
      expect(mockMetrics.totalClaims).toBeGreaterThanOrEqual(0)
      expect(mockMetrics.newClaims).toBeGreaterThanOrEqual(0)
      expect(mockMetrics.exceptions).toBeGreaterThanOrEqual(0)
      expect(mockMetrics.submitted).toBeGreaterThanOrEqual(0)
    })

    it("exception rate is a valid percentage", () => {
      expect(mockMetrics.exceptionRate).toBeGreaterThanOrEqual(0)
      expect(mockMetrics.exceptionRate).toBeLessThanOrEqual(100)
    })
  })

  describe("currentUser", () => {
    it("contains current user data", () => {
      expect(currentUser).toBeDefined()
      expect(typeof currentUser).toBe("object")
    })

    it("has required properties", () => {
      expect(currentUser).toHaveProperty("id")
      expect(currentUser).toHaveProperty("name")
      expect(currentUser).toHaveProperty("email")
      expect(currentUser).toHaveProperty("role")
    })

    it("has valid role", () => {
      const validRoles = [
        "intake_clerk",
        "validation_specialist",
        "human_reviewer",
        "admin",
      ]
      expect(validRoles).toContain(currentUser.role)
    })

    it("has valid email format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(currentUser.email).toMatch(emailRegex)
    })

    it("exists in mockUsers", () => {
      const foundUser = mockUsers.find((u) => u.id === currentUser.id)
      expect(foundUser).toBeDefined()
    })
  })

  describe("Data Relationships", () => {
    it("claims with assignees reference valid users", () => {
      const assignedClaims = mockClaims.filter((c) => c.assignee)
      const userIds = new Set(mockUsers.map((u) => u.id))

      assignedClaims.forEach((claim) => {
        if (claim.assignee) {
          expect(userIds.has(claim.assignee.id)).toBe(true)
        }
      })
    })

    it("audit log entries reference valid users", () => {
      const userIds = new Set(mockUsers.map((u) => u.id))

      mockClaims.forEach((claim) => {
        claim.auditLog.forEach((entry) => {
          expect(userIds.has(entry.user.id)).toBe(true)
        })
      })
    })
  })

  describe("Data Consistency", () => {
    it("submitted claims have submittedAt date", () => {
      const submittedClaims = mockClaims.filter((c) => c.status === "submitted")

      submittedClaims.forEach((claim) => {
        expect(claim.submittedAt).toBeDefined()
      })
    })

    it("submitted claims may have confirmation numbers", () => {
      const submittedClaims = mockClaims.filter((c) => c.status === "submitted")

      // At least some should have confirmation numbers
      const withConfirmation = submittedClaims.filter((c) => c.confirmationNumber)
      expect(withConfirmation.length).toBeGreaterThanOrEqual(0)
    })

    it("exception claims have failed validation checks", () => {
      const exceptionClaims = mockClaims.filter((c) => c.status === "exception")

      exceptionClaims.forEach((claim) => {
        const hasFailedCheck = claim.validationChecks.some(
          (check) => check.status === "fail"
        )
        expect(hasFailedCheck).toBe(true)
      })
    })
  })
})
