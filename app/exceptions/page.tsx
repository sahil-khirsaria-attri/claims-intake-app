"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MetricCard } from "@/components/ui/metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { claimsApi } from "@/lib/api/client"
import type { Claim } from "@/lib/types"
import {
  AlertTriangle,
  Clock,
  FileText,
  MoreHorizontal,
  ChevronRight,
  RefreshCw,
  FileSearch,
  Trash2,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ExceptionsPage() {
  const router = useRouter()
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null)
  const [exceptionClaims, setExceptionClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolvedToday] = useState(5) // This could come from metrics API

  const fetchExceptions = useCallback(async () => {
    setIsLoading(true)
    const response = await claimsApi.list({ status: "exception", limit: 100 })
    if (response.data) {
      const data = response.data as { data: Claim[] }
      setExceptionClaims(data.data || [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchExceptions()
  }, [fetchExceptions])

  const toggleSelectAll = () => {
    if (selectedClaims.length === exceptionClaims.length) {
      setSelectedClaims([])
    } else {
      setSelectedClaims(exceptionClaims.map((c) => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedClaims.includes(id)) {
      setSelectedClaims(selectedClaims.filter((c) => c !== id))
    } else {
      setSelectedClaims([...selectedClaims, id])
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchExceptions()
    setIsRefreshing(false)
    toast.success("Exception queue refreshed")
  }

  const handleSendToReview = async () => {
    // Update each selected claim to human_review status
    for (const claimId of selectedClaims) {
      await claimsApi.update(claimId, { status: "human_review" })
    }
    toast.success(`${selectedClaims.length} claim(s) sent to human review`)
    setSelectedClaims([])
    fetchExceptions()
  }

  const handleBulkDelete = () => {
    setClaimToDelete(null)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async (claimId?: string) => {
    if (claimId) {
      await claimsApi.delete(claimId)
      toast.success(`Claim ${claimId} deleted`)
    } else {
      for (const id of selectedClaims) {
        await claimsApi.delete(id)
      }
      toast.success(`${selectedClaims.length} claim(s) deleted`)
      setSelectedClaims([])
    }
    setDeleteDialogOpen(false)
    setClaimToDelete(null)
    fetchExceptions()
  }

  const handleReprocess = async (claimId: string) => {
    await claimsApi.process(claimId)
    toast.success(`Re-processing claim ${claimId}`)
    fetchExceptions()
  }

  const handleViewDetails = (claimId: string) => {
    router.push(`/claims/${claimId}`)
  }

  const lowQualityCount = exceptionClaims.filter((c) => c.confidenceScore < 60).length

  return (
    <AppShell title="Exception Queue" subtitle="Claims with processing errors or quality issues">
      {/* Metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <MetricCard title="Total Exceptions" value={exceptionClaims.length} icon={AlertTriangle} />
            <MetricCard title="Low Quality Scans" value={lowQualityCount} icon={FileText} />
            <MetricCard title="Avg. Age" value="1.2 days" icon={Clock} />
            <MetricCard
              title="Resolved Today"
              value={resolvedToday}
              change="+2 from yesterday"
              changeType="positive"
              icon={RefreshCw}
            />
          </>
        )}
      </div>

      {/* Actions Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedClaims.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground mr-2">{selectedClaims.length} selected</span>
              <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={handleSendToReview}>
                <FileSearch className="mr-2 h-4 w-4" />
                Send to Review
              </Button>
              <Button variant="outline" size="sm" className="border-border text-destructive bg-transparent" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Exception Queue Table */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedClaims.length === exceptionClaims.length && exceptionClaims.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Claim ID</TableHead>
                <TableHead className="text-muted-foreground">Patient</TableHead>
                <TableHead className="text-muted-foreground">Exception Reason</TableHead>
                <TableHead className="text-muted-foreground">Quality Score</TableHead>
                <TableHead className="text-muted-foreground">Age</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptionClaims.map((claim) => {
                const primaryIssue = claim.validationChecks?.find((c) => c.status === "fail")

                return (
                  <TableRow
                    key={claim.id}
                    className={cn(
                      "border-border cursor-pointer transition-colors",
                      selectedClaims.includes(claim.id) && "bg-accent/30",
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedClaims.includes(claim.id)}
                        onCheckedChange={() => toggleSelect(claim.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/claims/${claim.id}`} className="group flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                          {claim.id}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{claim.patientName || "Unknown"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-sm text-foreground">{primaryIssue?.name || "Processing Error"}</span>
                      </div>
                      {primaryIssue?.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">{primaryIssue.details}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          claim.confidenceScore >= 70 ? "text-warning" : "text-destructive",
                        )}
                      >
                        {claim.confidenceScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(claim.receivedAt))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(claim.id)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            await claimsApi.update(claim.id, { status: "human_review" })
                            toast.success(`Claim ${claim.id} sent to review`)
                            fetchExceptions()
                          }}>Send to Review</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReprocess(claim.id)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Re-process
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setClaimToDelete(claim.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {!isLoading && exceptionClaims.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">No exceptions</p>
            <p className="text-sm text-muted-foreground">All claims are processing normally</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {claimToDelete
                ? `This will permanently delete claim ${claimToDelete}. This action cannot be undone.`
                : `This will permanently delete ${selectedClaims.length} claim(s). This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(claimToDelete || undefined)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
