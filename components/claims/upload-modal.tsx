"use client"

import type React from "react"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Upload, FileText, X } from "lucide-react"
import type { DocumentType } from "@/lib/types"

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], type: DocumentType) => void
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: "cms_1500", label: "CMS-1500 Form" },
  { value: "ub_04", label: "UB-04 Form" },
  { value: "operative_notes", label: "Operative Notes" },
  { value: "h_and_p", label: "History & Physical" },
  { value: "prior_auth", label: "Prior Authorization" },
  { value: "referral", label: "Referral" },
  { value: "medical_records", label: "Medical Records" },
  { value: "other", label: "Other Document" },
]

export function UploadModal({ open, onOpenChange, onUpload }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([])
  const [docType, setDocType] = useState<DocumentType>("cms_1500")
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/"),
    )
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    onUpload(files, docType)
    setFiles([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>Add missing documents to this claim</DialogDescription>
        </DialogHeader>

        {/* Document Type */}
        <div className="space-y-2">
          <Label className="text-foreground">Document Type</Label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
            <SelectTrigger className="bg-secondary text-foreground">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border",
            "hover:border-primary/50",
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="mt-3 text-sm text-foreground">
            Drag and drop files here, or{" "}
            <label className="text-primary cursor-pointer hover:underline">
              browse
              <input type="file" multiple accept=".pdf,image/*" className="sr-only" onChange={handleFileSelect} />
            </label>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-2">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
