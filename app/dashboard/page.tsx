"use client"

import { useState, useRef, useCallback } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { MetricCard } from "@/components/ui/metric-card"
import { ClaimsTable } from "@/components/claims/claims-table"
import { ClaimsFilters } from "@/components/claims/claims-filters"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useClaims, useMetrics, useCreateClaim } from "@/lib/hooks/use-claims"
import { documentsApi } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/context"
import type { FilterValues } from "@/components/claims/claims-filters"
import { Inbox, Clock, AlertTriangle, FileSearch, CheckCircle, Plus, RefreshCw, Upload, X, FileText } from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const { user } = useAuth()
  const [newClaimOpen, setNewClaimOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Form state
  const patientNameRef = useRef<HTMLInputElement>(null)
  const memberIdRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [channel, setChannel] = useState("portal")
  const [priority, setPriority] = useState("medium")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Build params based on active tab
  const getClaimsParams = () => {
    const params: Record<string, string | number | undefined> = { page: 1, limit: 10 }
    if (activeTab === "my" && user) {
      params.assigneeId = user.id
    }
    if (activeTab === "unassigned") {
      params.assigneeId = "null" // Special value to get unassigned
    }
    return params
  }

  const { claims, pagination, isLoading: claimsLoading, refresh: refreshClaims, setPage, updateParams } = useClaims(getClaimsParams())
  const { metrics, isLoading: metricsLoading, refresh: refreshMetrics } = useMetrics()
  const { createClaim, isLoading: creating } = useCreateClaim()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle filter changes from ClaimsFilters component
  const handleFilterChange = useCallback((filters: FilterValues) => {
    updateParams({
      search: filters.search,
      status: filters.status,
      priority: filters.priority,
      channel: filters.channel,
      assigneeId: filters.assignee,
      dateRange: filters.dateRange,
      page: 1, // Reset to first page when filters change
    })
  }, [updateParams])

  // Filter claims for tab counts (client-side for now, could be optimized)
  const myClaims = claims.filter(c => c.assignee?.id === user?.id)
  const unassignedClaims = claims.filter(c => !c.assignee)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refreshClaims(), refreshMetrics()])
    setIsRefreshing(false)
    toast.success("Claims data refreshed")
  }

  const handleNewClaim = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await createClaim({
      patientName: patientNameRef.current?.value,
      memberId: memberIdRef.current?.value,
      submissionChannel: channel,
      priority: priority,
    })

    if (result.success && result.data) {
      // Upload files if any were selected
      if (selectedFiles.length > 0) {
        const claimId = (result.data as { id: string }).id
        let uploadedCount = 0
        let failedCount = 0

        for (const file of selectedFiles) {
          const uploadResult = await documentsApi.upload(claimId, file, 'other')
          if (uploadResult.error) {
            failedCount++
          } else {
            uploadedCount++
          }
        }

        if (failedCount > 0) {
          toast.warning(`Claim created. ${uploadedCount} file(s) uploaded, ${failedCount} failed.`)
        } else {
          toast.success(`Claim created with ${uploadedCount} document(s)`)
        }
      } else {
        toast.success("New claim created successfully")
      }

      resetForm()
      setNewClaimOpen(false)
      refreshClaims()
    } else {
      toast.error(result.error || "Failed to create claim")
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPage(1)
  }

  // File handling
  const validateFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type: ${file.name}. Only PDF, PNG, and JPG are allowed.`)
      return false
    }

    if (file.size > maxSize) {
      toast.error(`File too large: ${file.name}. Maximum size is 10MB.`)
      return false
    }

    return true
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const validFiles: File[] = []
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        // Check for duplicates
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
          validFiles.push(file)
        }
      }
    })

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      toast.success(`${validFiles.length} file(s) added`)
    }
  }, [selectedFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const resetForm = () => {
    setSelectedFiles([])
    setChannel("portal")
    setPriority("medium")
    if (patientNameRef.current) patientNameRef.current.value = ''
    if (memberIdRef.current) memberIdRef.current.value = ''
  }

  // Loading skeleton for metrics
  const MetricSkeleton = () => (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  )

  return (
    <AppShell title="Claims Inbox" subtitle="Manage and process incoming claims">
      {/* Metrics Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metricsLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="New Claims"
              value={metrics?.newClaims ?? 0}
              change="+5 from yesterday"
              changeType="neutral"
              icon={Inbox}
            />
            <MetricCard
              title="In Progress"
              value={metrics?.inProgress ?? 0}
              change="-12 from yesterday"
              changeType="positive"
              icon={Clock}
            />
            <MetricCard
              title="Exceptions"
              value={metrics?.exceptions ?? 0}
              change="+2 from yesterday"
              changeType="negative"
              icon={AlertTriangle}
            />
            <MetricCard
              title="Human Review"
              value={metrics?.humanReview ?? 0}
              change="Same as yesterday"
              changeType="neutral"
              icon={FileSearch}
            />
            <MetricCard
              title="Avg. Processing"
              value={metrics?.avgProcessingTime ?? "0h"}
              change="-0.3 hrs from last week"
              changeType="positive"
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Claims Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList className="bg-secondary">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All Claims ({pagination.total})
              </TabsTrigger>
              <TabsTrigger value="my" className="data-[state=active]:bg-background">
                My Claims ({myClaims.length})
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="data-[state=active]:bg-background">
                Unassigned ({unassignedClaims.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-transparent"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button size="sm" onClick={() => setNewClaimOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Claim
            </Button>
          </div>
        </div>

        <ClaimsFilters onFilterChange={handleFilterChange} currentUserId={user?.id} />

        {claimsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ClaimsTable claims={claims} onRefresh={refreshClaims} />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">
              {claims.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)}
            </span> of{" "}
            <span className="font-medium text-foreground">{pagination.total}</span> claims
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              className="border-border bg-transparent"
              onClick={() => setPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-transparent"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* New Claim Modal */}
      <Dialog open={newClaimOpen} onOpenChange={(open) => {
        if (!open) resetForm()
        setNewClaimOpen(open)
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Claim</DialogTitle>
            <DialogDescription>Enter claim details or upload documents to create a new claim</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewClaim} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="patientName" className="text-foreground">Patient Name</Label>
                <Input id="patientName" ref={patientNameRef} placeholder="John Doe" className="bg-input text-foreground" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberId" className="text-foreground">Member ID</Label>
                <Input id="memberId" ref={memberIdRef} placeholder="MBR-XXXXXXXXX" className="bg-input text-foreground" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel" className="text-foreground">Submission Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="fax">Fax</SelectItem>
                    <SelectItem value="edi">EDI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-foreground">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Upload Documents</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                />
                <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 10MB</p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium text-foreground">{selectedFiles.length} file(s) selected</p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-2 rounded-md bg-secondary"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewClaimOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Claim
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
