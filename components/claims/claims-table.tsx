"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Mail, Printer, Globe, Zap, ArrowUpDown, ChevronRight, Trash2, UserPlus, UserMinus, Flag } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { claimsApi } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/context"
import { toast } from "sonner"
import type { Claim, SubmissionChannel } from "@/lib/types"
import { cn } from "@/lib/utils"

const channelIcons: Record<SubmissionChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  fax: <Printer className="h-4 w-4" />,
  portal: <Globe className="h-4 w-4" />,
  edi: <Zap className="h-4 w-4" />,
}

interface ClaimsTableProps {
  claims: Claim[]
  onRefresh?: () => void
}

export function ClaimsTable({ claims, onRefresh }: ClaimsTableProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null)

  const toggleSelectAll = () => {
    if (selectedClaims.length === claims.length) {
      setSelectedClaims([])
    } else {
      setSelectedClaims(claims.map((c) => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedClaims.includes(id)) {
      setSelectedClaims(selectedClaims.filter((c) => c !== id))
    } else {
      setSelectedClaims([...selectedClaims, id])
    }
  }

  const handleViewDetails = (id: string) => {
    router.push(`/claims/${id}`)
  }

  const handleChangePriority = async (id: string, priority: string) => {
    const result = await claimsApi.update(id, { priority })
    if (result.error) {
      toast.error("Failed to update priority")
    } else {
      toast.success(`Priority changed to ${priority}`)
      onRefresh?.()
    }
  }

  const handleAssignToMe = async (id: string) => {
    if (!user) {
      toast.error("You must be logged in to assign claims")
      return
    }
    const result = await claimsApi.update(id, { assigneeId: user.id })
    if (result.error) {
      toast.error("Failed to assign claim")
    } else {
      toast.success("Claim assigned to you")
      onRefresh?.()
    }
  }

  const handleUnassign = async (id: string) => {
    const result = await claimsApi.update(id, { assigneeId: null })
    if (result.error) {
      toast.error("Failed to unassign claim")
    } else {
      toast.success("Claim unassigned")
      onRefresh?.()
    }
  }

  const handleDelete = async () => {
    if (!claimToDelete) return

    const result = await claimsApi.delete(claimToDelete)
    if (result.error) {
      toast.error("Failed to delete claim")
    } else {
      toast.success("Claim deleted")
      setDeleteDialogOpen(false)
      setClaimToDelete(null)
      onRefresh?.()
    }
  }

  const confirmDelete = (id: string) => {
    setClaimToDelete(id)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedClaims.length === claims.length && claims.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="text-muted-foreground">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                Claim ID
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground">Channel</TableHead>
            <TableHead className="text-muted-foreground">Patient / Member</TableHead>
            <TableHead className="text-muted-foreground">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                Received
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Priority</TableHead>
            <TableHead className="text-muted-foreground">Assignee</TableHead>
            <TableHead className="text-muted-foreground text-right">Confidence</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => (
            <TableRow
              key={claim.id}
              className={cn(
                "border-border cursor-pointer transition-colors",
                selectedClaims.includes(claim.id) && "bg-accent/30",
              )}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selectedClaims.includes(claim.id)} onCheckedChange={() => toggleSelect(claim.id)} />
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
                <div className="flex items-center gap-2 text-muted-foreground" title={claim.submissionChannel}>
                  {channelIcons[claim.submissionChannel]}
                  <span className="hidden capitalize sm:inline">{claim.submissionChannel}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium text-foreground">{claim.patientName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{claim.memberId || "—"}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(claim.receivedAt), { addSuffix: true })}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={claim.status} size="sm" />
              </TableCell>
              <TableCell>
                <StatusBadge status={claim.priority} size="sm" />
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
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {claim.confidenceScore > 0 ? (
                  <span
                    className={cn(
                      "text-sm font-medium",
                      claim.confidenceScore >= 90 && "text-success",
                      claim.confidenceScore >= 70 && claim.confidenceScore < 90 && "text-warning",
                      claim.confidenceScore < 70 && "text-destructive",
                    )}
                  >
                    {claim.confidenceScore}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
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
                    <DropdownMenuItem onClick={() => handleViewDetails(claim.id)}>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Flag className="mr-2 h-4 w-4" />
                        Change Priority
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleChangePriority(claim.id, "low")}>Low</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangePriority(claim.id, "medium")}>Medium</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangePriority(claim.id, "high")}>High</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangePriority(claim.id, "urgent")}>Urgent</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {claim.assignee?.id !== user?.id && (
                      <DropdownMenuItem onClick={() => handleAssignToMe(claim.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign to Me
                      </DropdownMenuItem>
                    )}
                    {claim.assignee && (
                      <DropdownMenuItem onClick={() => handleUnassign(claim.id)}>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unassign
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => confirmDelete(claim.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this claim? This action cannot be undone and will permanently remove the claim and all associated documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
