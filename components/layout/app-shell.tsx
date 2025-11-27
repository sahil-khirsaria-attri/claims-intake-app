"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "@/lib/auth/context"
import { useSidebar } from "@/lib/context/sidebar-context"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const { collapsed } = useSidebar()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Responsive margin: no margin on mobile, dynamic margin on desktop based on sidebar state */}
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <Header title={title} subtitle={subtitle} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
