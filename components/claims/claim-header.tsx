"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreHorizontal, UserPlus, Flag, Trash2, Mail, Printer, Globe, Zap } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { Claim, SubmissionChannel } from "@/lib/types"

const channelConfig: Record<SubmissionChannel, { icon: React.ReactNode; label: string }> = {
  email: { icon: <Mail className="h-4 w-4" />, label: "Email" },
  fax: { icon: <Printer className="h-4 w-4" />, label: "Fax" },
  portal: { icon: <Globe className="h-4 w-4" />, label: "Portal" },
  edi: { icon: <Zap className="h-4 w-4" />, label: "EDI" },
}

interface ClaimHeaderProps {
  claim: Claim
}

export function ClaimHeader({ claim }: ClaimHeaderProps) {
  const channel = channelConfig[claim.submissionChannel]

  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="mt-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{claim.id}</h1>
              <StatusBadge status={claim.status} />
              <StatusBadge status={claim.priority} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {channel.icon}
                <span>{channel.label}</span>
              </div>
              <span>Received {format(new Date(claim.receivedAt), "MMM d, yyyy 'at' h:mm a")}</span>
              {claim.totalAmount && (
                <span className="font-medium text-foreground">
                  ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {claim.assignee ? (
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={claim.assignee.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {claim.assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{claim.assignee.name}</span>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-border bg-transparent">
              <UserPlus className="mr-2 h-4 w-4" />
              Assign
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-border text-muted-foreground bg-transparent">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Flag className="mr-2 h-4 w-4" />
                Change Priority
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="mr-2 h-4 w-4" />
                Reassign
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Claim
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
