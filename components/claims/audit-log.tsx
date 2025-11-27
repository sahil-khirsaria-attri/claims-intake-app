"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import type { AuditLogEntry } from "@/lib/types"

interface AuditLogProps {
  entries: AuditLogEntry[]
}

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-card-foreground">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

          {entries.map((entry, index) => (
            <div key={entry.id} className="relative flex gap-3">
              <Avatar className="h-8 w-8 shrink-0 border-2 border-background z-10">
                <AvatarImage src={entry.user.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {entry.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{entry.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.action}</p>
                {entry.details && (
                  <p className="mt-1 text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1 inline-block">
                    {entry.details}
                  </p>
                )}
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
