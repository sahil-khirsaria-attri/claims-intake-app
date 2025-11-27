"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { metricsApi, usersApi, claimsApi } from "@/lib/api/client"
import { FileText, Clock, AlertTriangle, CheckCircle, TrendingUp, Users, Download, Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { DashboardMetrics, User } from "@/lib/types"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Mock chart data
const claimsOverTime = [
  { date: "Jan 1", submitted: 45, exceptions: 3, reviews: 5 },
  { date: "Jan 2", submitted: 52, exceptions: 2, reviews: 4 },
  { date: "Jan 3", submitted: 48, exceptions: 4, reviews: 6 },
  { date: "Jan 4", submitted: 61, exceptions: 2, reviews: 3 },
  { date: "Jan 5", submitted: 55, exceptions: 3, reviews: 5 },
  { date: "Jan 6", submitted: 67, exceptions: 1, reviews: 4 },
  { date: "Jan 7", submitted: 58, exceptions: 2, reviews: 3 },
]

const statusDistribution = [
  { name: "Submitted", value: 1016, color: "hsl(var(--success))" },
  { name: "In Progress", value: 156, color: "hsl(var(--chart-5))" },
  { name: "Human Review", value: 18, color: "hsl(var(--warning))" },
  { name: "Exceptions", value: 34, color: "hsl(var(--destructive))" },
  { name: "New", value: 23, color: "hsl(var(--chart-1))" },
]

const channelData = [
  { channel: "Portal", count: 523 },
  { channel: "EDI", count: 412 },
  { channel: "Email", count: 198 },
  { channel: "Fax", count: 114 },
]

const userPerformance = [
  { name: "Sarah Johnson", processed: 245, avgTime: "3.8 hrs", accuracy: 98.2 },
  { name: "Michael Chen", processed: 198, avgTime: "4.1 hrs", accuracy: 97.5 },
  { name: "Emily Davis", processed: 167, avgTime: "4.5 hrs", accuracy: 96.8 },
  { name: "Robert Wilson", processed: 142, avgTime: "4.2 hrs", accuracy: 97.1 },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d")
  const [isExporting, setIsExporting] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [metricsResponse, usersResponse] = await Promise.all([
      metricsApi.getDashboard(),
      usersApi.list()
    ])
    if (metricsResponse.data) {
      setMetrics(metricsResponse.data as DashboardMetrics)
    }
    if (usersResponse.data) {
      setUsers(usersResponse.data as User[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = async () => {
    setIsExporting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsExporting(false)
    toast.success("Report exported successfully", {
      description: "analytics_report.pdf has been downloaded",
    })
  }

  if (isLoading || !metrics) {
    return (
      <AppShell title="Analytics Dashboard" subtitle="Claims processing metrics and insights">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Analytics Dashboard" subtitle="Claims processing metrics and insights">
      {/* Date Range Filter */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] bg-secondary text-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="border-border bg-transparent" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard
          title="Total Claims"
          value={metrics.totalClaims.toLocaleString()}
          change="+12% from last period"
          changeType="positive"
          icon={FileText}
        />
        <MetricCard
          title="Submitted"
          value={metrics.submitted.toLocaleString()}
          change="+8% from last period"
          changeType="positive"
          icon={CheckCircle}
        />
        <MetricCard
          title="Exception Rate"
          value={`${metrics.exceptionRate}%`}
          change="-0.3% from last period"
          changeType="positive"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Avg. Processing"
          value={metrics.avgProcessingTime}
          change="-12% from last period"
          changeType="positive"
          icon={Clock}
        />
        <MetricCard
          title="Success Rate"
          value="97.3%"
          change="+0.5% from last period"
          changeType="positive"
          icon={TrendingUp}
        />
        <MetricCard title="Active Users" value={users.length} icon={Users} />
      </div>

      {/* Charts Row 1 */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Claims Over Time */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground">Claims Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={claimsOverTime}>
                  <defs>
                    <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    stroke="hsl(var(--success))"
                    fillOpacity={1}
                    fill="url(#colorSubmitted)"
                  />
                  <Area
                    type="monotone"
                    dataKey="exceptions"
                    stroke="hsl(var(--destructive))"
                    fillOpacity={0.3}
                    fill="hsl(var(--destructive))"
                  />
                  <Area
                    type="monotone"
                    dataKey="reviews"
                    stroke="hsl(var(--warning))"
                    fillOpacity={0.3}
                    fill="hsl(var(--warning))"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-muted-foreground">Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Exceptions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">Reviews</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Claims by Channel */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground">Claims by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="channel"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Performance */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground">Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPerformance.map((user, index) => (
                <div key={user.name} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{user.processed} claims</span>
                      <span>Avg: {user.avgTime}</span>
                      <span className="text-success">{user.accuracy}% accuracy</span>
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(user.processed / 250) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
