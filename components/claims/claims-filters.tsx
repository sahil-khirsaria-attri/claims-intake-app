"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { useDebounce } from "@/lib/hooks/use-debounce"

export interface ClaimsFiltersProps {
  onFilterChange?: (filters: FilterValues) => void
  currentUserId?: string
}

export interface FilterValues {
  search?: string
  status?: string
  priority?: string
  channel?: string
  assignee?: string
  dateRange?: string
}

export function ClaimsFilters({ onFilterChange, currentUserId }: ClaimsFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [filters, setFilters] = useState<FilterValues>({
    status: "all",
    priority: "all",
    channel: "all",
    assignee: "all",
    dateRange: "7d",
  })

  const debouncedSearch = useDebounce(searchValue, 300)

  // Count active filters (excluding defaults)
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== "all" && key !== "dateRange"
  ).length + (searchValue ? 1 : 0)

  const handleFilterChange = useCallback((key: keyof FilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleClearAll = useCallback(() => {
    setSearchValue("")
    setFilters({
      status: "all",
      priority: "all",
      channel: "all",
      assignee: "all",
      dateRange: "7d",
    })
  }, [])

  // Emit filter changes
  useEffect(() => {
    const filterValues: FilterValues = { ...filters }

    // Only include non-default values
    if (filters.status === "all") delete filterValues.status
    if (filters.priority === "all") delete filterValues.priority
    if (filters.channel === "all") delete filterValues.channel
    if (filters.assignee === "all") delete filterValues.assignee

    // Handle assignee special cases
    if (filters.assignee === "me" && currentUserId) {
      filterValues.assignee = currentUserId
    } else if (filters.assignee === "unassigned") {
      filterValues.assignee = "null"
    }

    // Include search if present
    if (debouncedSearch) {
      filterValues.search = debouncedSearch
    }

    onFilterChange?.(filterValues)
  }, [filters, debouncedSearch, onFilterChange, currentUserId])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Claim ID, Patient, or Member ID..."
            className="pl-9 bg-secondary text-foreground placeholder:text-muted-foreground"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchValue("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-border text-foreground"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
            {showFilters && <X className="ml-2 h-3 w-3" />}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4">
          <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
            <SelectTrigger className="w-[140px] bg-secondary text-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="validation_complete">Validated</SelectItem>
              <SelectItem value="exception">Exception</SelectItem>
              <SelectItem value="human_review">Human Review</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority} onValueChange={(value) => handleFilterChange("priority", value)}>
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

          <Select value={filters.channel} onValueChange={(value) => handleFilterChange("channel", value)}>
            <SelectTrigger className="w-[140px] bg-secondary text-foreground">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="fax">Fax</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
              <SelectItem value="edi">EDI</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.assignee} onValueChange={(value) => handleFilterChange("assignee", value)}>
            <SelectTrigger className="w-[160px] bg-secondary text-foreground">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
            <SelectTrigger className="w-[140px] bg-secondary text-foreground">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
