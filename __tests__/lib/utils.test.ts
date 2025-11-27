import { cn } from "@/lib/utils"

describe("Utils", () => {
  describe("cn (className utility)", () => {
    it("merges class names correctly", () => {
      const result = cn("class1", "class2")
      expect(result).toContain("class1")
      expect(result).toContain("class2")
    })

    it("handles undefined values", () => {
      const result = cn("class1", undefined, "class2")
      expect(result).toContain("class1")
      expect(result).toContain("class2")
      expect(result).not.toContain("undefined")
    })

    it("handles null values", () => {
      const result = cn("class1", null, "class2")
      expect(result).toContain("class1")
      expect(result).toContain("class2")
    })

    it("handles boolean values", () => {
      const result = cn("class1", false && "class2", true && "class3")
      expect(result).toContain("class1")
      expect(result).not.toContain("class2")
      expect(result).toContain("class3")
    })

    it("handles empty strings", () => {
      const result = cn("class1", "", "class2")
      expect(result).toContain("class1")
      expect(result).toContain("class2")
    })

    it("handles arrays", () => {
      const result = cn(["class1", "class2"])
      expect(result).toContain("class1")
      expect(result).toContain("class2")
    })

    it("handles objects", () => {
      const result = cn({ class1: true, class2: false, class3: true })
      expect(result).toContain("class1")
      expect(result).not.toContain("class2")
      expect(result).toContain("class3")
    })

    it("merges Tailwind classes correctly", () => {
      // tailwind-merge should handle conflicting classes
      const result = cn("px-2", "px-4")
      expect(result).toContain("px-4")
      expect(result).not.toContain("px-2")
    })

    it("handles complex Tailwind merging", () => {
      const result = cn(
        "text-red-500",
        "bg-blue-500 text-white"
      )
      expect(result).toContain("text-white")
      expect(result).toContain("bg-blue-500")
    })

    it("handles no arguments", () => {
      const result = cn()
      expect(result).toBe("")
    })

    it("handles single class", () => {
      const result = cn("single-class")
      expect(result).toBe("single-class")
    })

    it("handles mixed types", () => {
      const result = cn(
        "base-class",
        { conditional: true },
        ["array-class"],
        undefined,
        null,
        "final-class"
      )
      expect(result).toContain("base-class")
      expect(result).toContain("conditional")
      expect(result).toContain("array-class")
      expect(result).toContain("final-class")
    })

    it("trims whitespace", () => {
      const result = cn("  class1  ", "class2")
      expect(result).not.toMatch(/^\s/)
      expect(result).not.toMatch(/\s$/)
    })

    it("handles duplicate classes", () => {
      const result = cn("class1", "class1", "class1")
      // clsx preserves duplicates, tailwind-merge handles Tailwind-specific deduplication
      expect(result).toContain("class1")
    })
  })
})
