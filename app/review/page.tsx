"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MetricCard } from "@/components/ui/metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { claimsApi, usersApi } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/context"
import type { Claim, User } from "@/lib/types"
import {
  FileSearch,
  Clock,
  Users,
  AlertTriangle,
  MoreHorizontal,
  UserPlus,
  FileUp,
  XCircle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function HumanReviewPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignee, setAssignee] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [reviewClaims, setReviewClaims] = useState<Claim[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchReviewClaims = useCallback(async () => {
    setIsLoading(true)

    // Fetch claims with human_review or exception status
    const [humanReviewResponse, exceptionResponse] = await Promise.all([
      claimsApi.list({ status: "human_review", limit: 100 }),
      claimsApi.list({ status: "exception", limit: 100 }),
    ])

    const humanReviewClaims = (humanReviewResponse.data as { data: Claim[] })?.data || []
    const exceptionClaims = (exceptionResponse.data as { data: Claim[] })?.data || []

    setReviewClaims([...humanReviewClaims, ...exceptionClaims])
    setIsLoading(false)
  }, [])

  const fetchUsers = useCallback(async () => {
    const response = await usersApi.list({ isActive: true })
    if (response.data) {
      setUsers(response.data as User[])
    }
  }, [])

  useEffect(() => {
    fetchReviewClaims()
    fetchUsers()
  }, [fetchReviewClaims, fetchUsers])

  // Apply filters
  const filteredClaims = reviewClaims.filter((claim) => {
    const matchesPriority = priorityFilter === "all" || claim.priority === priorityFilter
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "me" && claim.assignee?.id === currentUser?.id) ||
      (assigneeFilter === "unassigned" && !claim.assignee)
    return matchesPriority && matchesAssignee
  })

  const toggleSelectAll = () => {
    if (selectedClaims.length === filteredClaims.length) {
      setSelectedClaims([])
    } else {
      setSelectedClaims(filteredClaims.map((c) => c.id))
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
    await fetchReviewClaims()
    setIsRefreshing(false)
    toast.success("Review queue refreshed")
  }

  const handleAssign = async () => {
    if (!assignee) {
      toast.error("Please select an assignee")
      return
    }

    for (const claimId of selectedClaims) {
      await claimsApi.update(claimId, { assigneeId: assignee })
    }

    const assignedUser = users.find(u => u.id === assignee)
    toast.success(`${selectedClaims.length} claim(s) assigned to ${assignedUser?.name}`)
    setAssignModalOpen(false)
    setSelectedClaims([])
    setAssignee("")
    fetchReviewClaims()
  }

  const handleAssignToMe = async (claimId: string) => {
    if (!currentUser) return
    await claimsApi.update(claimId, { assigneeId: currentUser.id })
    toast.success(`Claim ${claimId} assigned to you`)
    fetchReviewClaims()
  }

  const handleRequestDocs = () => {
    toast.success(`Document request sent for ${selectedClaims.length} claim(s)`)
    setSelectedClaims([])
  }

  const handleStartReview = (claimId: string) => {
    router.push(`/review/${claimId}`)
  }

  const handleReject = async (claimId: string) => {
    await claimsApi.update(claimId, { status: "rejected" })
    toast.success(`Claim ${claimId} rejected`)
    fetchReviewClaims()
  }

  const myClaimsCount = reviewClaims.filter((c) => c.assignee?.id === currentUser?.id).length
  const highPriorityCount = reviewClaims.filter((c) => c.priority === "high" || c.priority === "urgent").length

  return (
    <AppShell title="Human Review Queue" subtitle="Claims requiring manual review and intervention">
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
            <MetricCard title="Pending Review" value={reviewClaims.length} icon={FileSearch} />
            <MetricCard
              title="Avg. Wait Time"
              value="2.4 hrs"
              change="-0.5 hrs from yesterday"
              changeType="positive"
              icon={Clock}
            />
            <MetricCard title="Assigned to Me" value={myClaimsCount} icon={Users} />
            <MetricCard title="High Priority" value={highPriorityCount} icon={AlertTriangle} />
          </>
        )}
      </div>

      {/* Actions Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] bg-secondary text-foreground">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Claims</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] bg-secondary text-foreground">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedClaims.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm text-muted-foreground">{selectedClaims.length} selected</span>
              <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={() => setAssignModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </Button>
              <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={handleRequestDocs}>
                <FileUp className="mr-2 h-4 w-4" />
                Request Docs
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="border-border bg-transparent" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Review Queue Table */}
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
                    checked={selectedClaims.length === filteredClaims.length && filteredClaims.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Claim ID</TableHead>
                <TableHead className="text-muted-foreground">Patient / Member</TableHead>
                <TableHead className="text-muted-foreground">Issues</TableHead>
                <TableHead className="text-muted-foreground">Priority</TableHead>
                <TableHead className="text-muted-foreground">Waiting</TableHead>
                <TableHead className="text-muted-foreground">Assignee</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => {
                const failedChecks = claim.validationChecks?.filter((c) => c.status === "fail") || []
                const warningChecks = claim.validationChecks?.filter((c) => c.status === "warning") || []

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
                      <Link href={`/review/${claim.id}`} className="group flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                          {claim.id}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{claim.patientName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{claim.memberId || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {failedChecks.length > 0 && (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">{failedChecks.length}</span>
                          </div>
                        )}
                        {warningChecks.length > 0 && (
                          <div className="flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">{warningChecks.length}</span>
                          </div>
                        )}
                        {failedChecks.length === 0 && warningChecks.length === 0 && (
                          <span className="text-xs text-muted-foreground">No issues</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={claim.priority} size="sm" />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(claim.receivedAt))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {claim.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={claim.assignee.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {claim.assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="hidden text-sm text-muted-foreground lg:inline">
                            {claim.assignee.name.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => handleAssignToMe(claim.id)}>
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Assign
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartReview(claim.id)}>Start Review</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignToMe(claim.id)}>Assign to Me</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success(`Document request sent for ${claim.id}`)}>Request Documents</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success(`Priority updated for ${claim.id}`)}>Change Priority</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleReject(claim.id)}>Reject Claim</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {!isLoading && filteredClaims.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success" />
            <p className="mt-4 text-lg font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No claims currently require human review</p>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Claims</DialogTitle>
            <DialogDescription>Assign {selectedClaims.length} claim(s) to a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-foreground">Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="bg-secondary text-foreground">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                            {user.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
