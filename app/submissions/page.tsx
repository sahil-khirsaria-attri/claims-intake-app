"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { MetricCard } from "@/components/ui/metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { claimsApi } from "@/lib/api/client"
import {
  CheckCircle,
  DollarSign,
  Clock,
  TrendingUp,
  Search,
  Download,
  Eye,
  ChevronRight,
  FileText,
  ExternalLink,
  Copy,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Claim, PayerStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const payerStatusConfig: Record<PayerStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground", bgColor: "bg-muted" },
  accepted: { label: "Accepted", color: "text-success", bgColor: "bg-success/10" },
  in_review: { label: "In Review", color: "text-chart-5", bgColor: "bg-chart-5/10" },
  paid: { label: "Paid", color: "text-success", bgColor: "bg-success/10" },
  denied: { label: "Denied", color: "text-destructive", bgColor: "bg-destructive/10" },
  partial_payment: { label: "Partial Payment", color: "text-warning", bgColor: "bg-warning/10" },
}

export default function SubmissionsPage() {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [submittedClaims, setSubmittedClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState("7d")

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true)
    const response = await claimsApi.list({ status: "submitted", limit: 100 })
    if (response.data) {
      const data = response.data as { data: Claim[] }
      setSubmittedClaims(data.data || [])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  // Filter claims based on search
  const filteredClaims = submittedClaims.filter((claim) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      claim.id.toLowerCase().includes(query) ||
      claim.confirmationNumber?.toLowerCase().includes(query) ||
      claim.patientName?.toLowerCase().includes(query)
    )
  })

  const totalAmount = filteredClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0)

  const openDetails = (claim: Claim) => {
    setSelectedClaim(claim)
    setDetailsOpen(true)
  }

  const openTracking = (claim: Claim) => {
    setSelectedClaim(claim)
    setTrackingOpen(true)
  }

  const handleDownloadEDI = (claim: Claim) => {
    if (!claim.ediContent) {
      toast.error("EDI content not available for this claim")
      return
    }

    const blob = new Blob([claim.ediContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${claim.id}_837P.x12`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`EDI file downloaded: ${claim.id}_837P.x12`)
  }

  const handleCopyEDI = (claim: Claim) => {
    if (!claim.ediContent) {
      toast.error("EDI content not available")
      return
    }
    navigator.clipboard.writeText(claim.ediContent)
    toast.success("EDI content copied to clipboard")
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ["Claim ID", "Patient", "Member ID", "Submitted Date", "Confirmation #", "Amount", "Status"]
    const rows = filteredClaims.map((claim) => [
      claim.id,
      claim.patientName || "",
      claim.memberId || "",
      claim.submittedAt ? format(new Date(claim.submittedAt), "yyyy-MM-dd HH:mm:ss") : "",
      claim.confirmationNumber || "",
      claim.totalAmount?.toString() || "0",
      claim.status,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `submissions_${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success("Export downloaded successfully")
  }

  return (
    <AppShell title="Submission History" subtitle="Track submitted claims and their status">
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
            <MetricCard
              title="Total Submitted"
              value={submittedClaims.length}
              change="+48 this week"
              changeType="positive"
              icon={CheckCircle}
            />
            <MetricCard title="Total Amount" value={`$${totalAmount.toLocaleString()}`} icon={DollarSign} />
            <MetricCard title="Avg. Processing" value="4.2 hrs" change="-0.3 hrs" changeType="positive" icon={Clock} />
            <MetricCard title="Success Rate" value="97.3%" change="+0.5%" changeType="positive" icon={TrendingUp} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Claim ID or Confirmation..."
            className="pl-9 bg-secondary text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px] bg-secondary text-foreground">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="border-border bg-transparent" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Submissions Table */}
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
                <TableHead className="text-muted-foreground">Claim ID</TableHead>
                <TableHead className="text-muted-foreground">Patient</TableHead>
                <TableHead className="text-muted-foreground">Submitted</TableHead>
                <TableHead className="text-muted-foreground">Confirmation #</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow key={claim.id} className="border-border">
                  <TableCell>
                    <Link href={`/claims/${claim.id}`} className="group flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                        {claim.id}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{claim.patientName}</p>
                    <p className="text-xs text-muted-foreground">{claim.memberId}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {claim.submittedAt ? format(new Date(claim.submittedAt), "MMM d, yyyy h:mm a") : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-foreground">{claim.confirmationNumber || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-foreground">
                      ${claim.totalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => openDetails(claim)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!isLoading && filteredClaims.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">No submissions yet</p>
            <p className="text-sm text-muted-foreground">Submitted claims will appear here</p>
          </div>
        )}
      </div>

      {/* Submission Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="edi">EDI Content</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 mt-4">
                {/* Claim Summary */}
                <Card className="border-border bg-secondary/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Claim ID</span>
                      <span className="text-sm font-mono font-medium text-foreground">{selectedClaim.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Patient</span>
                      <span className="text-sm text-foreground">{selectedClaim.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Member ID</span>
                      <span className="text-sm font-mono text-foreground">{selectedClaim.memberId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-sm font-medium text-foreground">
                        ${selectedClaim.totalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Info */}
                <Card className="border-success/30 bg-success/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Successfully Submitted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Confirmation #</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {selectedClaim.confirmationNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Submitted At</span>
                      <span className="text-sm text-foreground">
                        {selectedClaim.submittedAt && format(new Date(selectedClaim.submittedAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">EDI Format</span>
                      <span className="text-sm text-foreground">837P</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payer</span>
                      <span className="text-sm text-foreground">
                        {selectedClaim.payerTracking?.payerName || "—"}
                      </span>
                    </div>
                    {selectedClaim.payerTracking?.expectedPaymentDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expected Payment</span>
                        <span className="text-sm text-foreground">
                          {format(new Date(selectedClaim.payerTracking.expectedPaymentDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-border bg-transparent"
                    onClick={() => handleDownloadEDI(selectedClaim)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download EDI
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-border bg-transparent"
                    onClick={() => {
                      setDetailsOpen(false)
                      openTracking(selectedClaim)
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Track Status
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="edi" className="mt-4">
                <Card className="border-border bg-secondary/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-foreground">EDI 837P Content</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => handleCopyEDI(selectedClaim)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {selectedClaim.ediContent ? (
                      <pre className="text-xs font-mono bg-background p-4 rounded-lg overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
                        {selectedClaim.ediContent}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">EDI content not available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-border bg-transparent"
                    onClick={() => handleDownloadEDI(selectedClaim)}
                    disabled={!selectedClaim.ediContent}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download as .x12
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Payer Tracking Modal */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payer Status Tracking</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              {/* Claim Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-mono font-medium text-foreground">{selectedClaim.id}</p>
                  <p className="text-xs text-muted-foreground">{selectedClaim.patientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    ${selectedClaim.totalAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedClaim.confirmationNumber}</p>
                </div>
              </div>

              {selectedClaim.payerTracking ? (
                <>
                  {/* Current Status */}
                  <Card className={cn("border", payerStatusConfig[selectedClaim.payerTracking.status].bgColor)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Status</p>
                          <p className={cn("text-lg font-semibold", payerStatusConfig[selectedClaim.payerTracking.status].color)}>
                            {payerStatusConfig[selectedClaim.payerTracking.status].label}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Payer</p>
                          <p className="text-sm font-medium text-foreground">{selectedClaim.payerTracking.payerName}</p>
                        </div>
                      </div>
                      {selectedClaim.payerTracking.expectedPaymentDate && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Expected Payment Date</p>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(selectedClaim.payerTracking.expectedPaymentDate), "MMMM d, yyyy")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-foreground">Status Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedClaim.payerTracking.trackingEvents.map((event, index) => {
                          const isLast = index === selectedClaim.payerTracking!.trackingEvents.length - 1
                          return (
                            <div key={index} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                {isLast ? (
                                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                                )}
                                {index < selectedClaim.payerTracking!.trackingEvents.length - 1 && (
                                  <div className="w-px h-full bg-border mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className={cn("text-sm font-medium", isLast ? "text-success" : "text-foreground")}>
                                  {event.status}
                                </p>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(event.timestamp), "MMM d, yyyy h:mm a")}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Tracking information not yet available</p>
                  <p className="text-xs text-muted-foreground">Check back in 1-2 business days</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
