"use client"

import { useState, useEffect, useCallback } from "react"
import { claimsApi, metricsApi } from "@/lib/api/client"
import type { Claim, DashboardMetrics } from "@/lib/types"

export interface ClaimsListParams {
  page?: number
  limit?: number
  status?: string
  priority?: string
  search?: string
  assigneeId?: string
  channel?: string
  dateRange?: string
}

export interface ClaimsListResult {
  data: Claim[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useClaims(initialParams?: ClaimsListParams) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<ClaimsListParams>(initialParams || { page: 1, limit: 10 })

  const fetchClaims = useCallback(async (fetchParams?: ClaimsListParams) => {
    setIsLoading(true)
    setError(null)

    const queryParams = fetchParams || params
    const response = await claimsApi.list(queryParams)

    if (response.error) {
      setError(response.error)
      setClaims([])
    } else if (response.data) {
      const result = response.data as ClaimsListResult
      setClaims(result.data || [])
      setPagination(result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
    }

    setIsLoading(false)
  }, [params])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const refresh = useCallback(() => {
    return fetchClaims(params)
  }, [fetchClaims, params])

  const updateParams = useCallback((newParams: Partial<ClaimsListParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }, [])

  const setPage = useCallback((page: number) => {
    updateParams({ page })
  }, [updateParams])

  return {
    claims,
    pagination,
    isLoading,
    error,
    params,
    refresh,
    updateParams,
    setPage,
  }
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async (range?: string) => {
    setIsLoading(true)
    setError(null)

    const response = await metricsApi.get(range)

    if (response.error) {
      setError(response.error)
      setMetrics(null)
    } else if (response.data) {
      setMetrics(response.data as DashboardMetrics)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const refresh = useCallback((range?: string) => {
    return fetchMetrics(range)
  }, [fetchMetrics])

  return {
    metrics,
    isLoading,
    error,
    refresh,
  }
}

export function useCreateClaim() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createClaim = useCallback(async (data: {
    submissionChannel?: string
    priority?: string
    patientName?: string
    memberId?: string
  }) => {
    setIsLoading(true)
    setError(null)

    const response = await claimsApi.create(data)

    setIsLoading(false)

    if (response.error) {
      setError(response.error)
      return { success: false, error: response.error }
    }

    return { success: true, data: response.data as Claim }
  }, [])

  return {
    createClaim,
    isLoading,
    error,
  }
}
