"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileText, Upload, Eye, Download, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2, FileType, Copy } from "lucide-react"
import type { Document, DocumentType } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { documentsApi } from "@/lib/api/client"
import { toast } from "sonner"

const documentTypeLabels: Record<DocumentType, string> = {
  cms_1500: "CMS-1500 Form",
  ub_04: "UB-04 Form",
  operative_notes: "Operative Notes",
  h_and_p: "History & Physical",
  prior_auth: "Prior Authorization",
  referral: "Referral",
  medical_records: "Medical Records",
  other: "Other Document",
}

const ocrStatusConfig = {
  pending: { icon: Clock, label: "Pending", className: "text-muted-foreground" },
  processing: { icon: RefreshCw, label: "Processing", className: "text-chart-5 animate-spin" },
  complete: { icon: CheckCircle, label: "Complete", className: "text-success" },
  failed: { icon: AlertCircle, label: "Failed", className: "text-destructive" },
}

interface DocumentListProps {
  documents: Document[]
  onUpload?: () => void
  onDocumentDeleted?: () => void
}

export function DocumentList({ documents, onUpload, onDocumentDeleted }: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/file`)
      if (!response.ok) {
        throw new Error("Failed to download file")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Download started")
    } catch (error) {
      toast.error("Failed to download document")
    }
  }

  const handleDelete = async () => {
    if (!docToDelete) return

    setIsDeleting(true)
    const result = await documentsApi.delete(docToDelete.id)
    setIsDeleting(false)

    if (result.error) {
      toast.error("Failed to delete document")
    } else {
      toast.success("Document deleted")
      setDeleteConfirmOpen(false)
      setDocToDelete(null)
      onDocumentDeleted?.()
    }
  }

  const getFileUrl = (doc: Document) => `/api/documents/${doc.id}/file`

  const isImage = (doc: Document) => {
    const ext = doc.name.toLowerCase()
    return ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif") || ext.endsWith(".webp")
  }

  const isPdf = (doc: Document) => {
    return doc.name.toLowerCase().endsWith(".pdf")
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Text copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy text")
    }
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-medium text-card-foreground">Documents ({documents.length})</CardTitle>
          <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={onUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No documents attached</p>
              <Button variant="outline" size="sm" className="mt-4 border-border bg-transparent" onClick={onUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
            </div>
          ) : (
            documents.map((doc) => {
              const OcrIcon = ocrStatusConfig[doc.ocrStatus].icon
              return (
                <div
                  key={doc.id}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{documentTypeLabels[doc.type]}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <div className={cn("flex items-center gap-1", ocrStatusConfig[doc.ocrStatus].className)}>
                        <OcrIcon className="h-3 w-3" />
                        <span>OCR: {ocrStatusConfig[doc.ocrStatus].label}</span>
                      </div>
                      {doc.ocrStatus === "complete" && (
                        <>
                          <span className="text-muted-foreground">
                            Classification:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                doc.classificationConfidence >= 90
                                  ? "text-success"
                                  : doc.classificationConfidence >= 70
                                    ? "text-warning"
                                    : "text-destructive",
                              )}
                            >
                              {doc.classificationConfidence}%
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            Quality:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                doc.qualityScore >= 90
                                  ? "text-success"
                                  : doc.qualityScore >= 70
                                    ? "text-warning"
                                    : "text-destructive",
                              )}
                            >
                              {doc.qualityScore}%
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedDoc(doc)
                        setPreviewOpen(true)
                      }}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setDocToDelete(doc)
                        setDeleteConfirmOpen(true)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
            <DialogDescription>
              {selectedDoc && documentTypeLabels[selectedDoc.type]}
              {selectedDoc?.ocrStatus === "complete" && (
                <span className="ml-2 text-success">Text extracted</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDoc?.rawOcrText ? (
            <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-secondary">
                <TabsTrigger value="preview" className="data-[state=active]:bg-background">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="text" className="data-[state=active]:bg-background">
                  <FileType className="mr-2 h-4 w-4" />
                  Extracted Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
                <div className="h-full bg-muted rounded-lg overflow-hidden">
                  {selectedDoc && isPdf(selectedDoc) ? (
                    <iframe
                      src={getFileUrl(selectedDoc)}
                      className="w-full h-full border-0"
                      title={selectedDoc.name}
                    />
                  ) : selectedDoc && isImage(selectedDoc) ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getFileUrl(selectedDoc)}
                        alt={selectedDoc.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <div className="text-center p-8">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                        <p className="mt-4 text-muted-foreground">
                          Preview not available for this file type
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => selectedDoc && handleDownload(selectedDoc)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download to view
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="flex-1 min-h-0 mt-4">
                <div className="h-full flex flex-col bg-muted rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-background/50">
                    <span className="text-sm text-muted-foreground">
                      {selectedDoc.rawOcrText?.length || 0} characters extracted
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedDoc.rawOcrText && copyToClipboard(selectedDoc.rawOcrText)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Text
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                      {selectedDoc.rawOcrText}
                    </pre>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 min-h-0 bg-muted rounded-lg overflow-hidden">
              {selectedDoc && isPdf(selectedDoc) ? (
                <iframe
                  src={getFileUrl(selectedDoc)}
                  className="w-full h-full border-0"
                  title={selectedDoc.name}
                />
              ) : selectedDoc && isImage(selectedDoc) ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFileUrl(selectedDoc)}
                    alt={selectedDoc.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                    <p className="mt-4 text-muted-foreground">
                      Preview not available for this file type
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => selectedDoc && handleDownload(selectedDoc)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download to view
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{docToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setDocToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
