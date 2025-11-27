"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Inbox,
  FileSearch,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import type { UserRole } from "@/lib/types"
import { useAuth } from "@/lib/auth/context"
import { useSidebar } from "@/lib/context/sidebar-context"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: UserRole[]
  badgeKey?: string
}

const navItems: NavItem[] = [
  { label: "Claims Inbox", href: "/dashboard", icon: <Inbox className="h-5 w-5" />, badgeKey: "inbox" },
  { label: "Human Review", href: "/review", icon: <FileSearch className="h-5 w-5" />, badgeKey: "review" },
  { label: "Exceptions", href: "/exceptions", icon: <AlertCircle className="h-5 w-5" />, badgeKey: "exceptions" },
  { label: "Submissions", href: "/submissions", icon: <CheckCircle className="h-5 w-5" /> },
  { label: "Analytics", href: "/analytics", icon: <BarChart3 className="h-5 w-5" />, roles: ["admin"] },
  { label: "Users", href: "/users", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
]

interface SidebarProps {
  userRole?: UserRole
}

interface ClaimCounts {
  inbox: number
  review: number
  exceptions: number
}

export function Sidebar({ userRole = "validation_specialist" }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const { collapsed, toggleCollapsed } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [counts, setCounts] = useState<ClaimCounts>({ inbox: 0, review: 0, exceptions: 0 })

  const filteredNavItems = navItems.filter((item) => !item.roles || item.roles.includes(userRole))

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/claims/counts")
      if (response.ok) {
        const data = await response.json()
        setCounts(data)
      }
    } catch (error) {
      console.error("Failed to fetch claim counts:", error)
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  const handleSignOut = async () => {
    await logout()
    router.replace("/login")
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const getBadgeCount = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined
    const count = counts[badgeKey as keyof ClaimCounts]
    return count > 0 ? count : undefined
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          // Desktop: always visible, can collapse
          "hidden lg:block",
          collapsed ? "lg:w-16" : "lg:w-64",
          // Mobile: slide in/out
          mobileOpen && "block w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            {!collapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">AI</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sidebar-foreground leading-tight">ClaimsAI</span>
                  <span className="text-[10px] text-sidebar-foreground/60 leading-tight">Intelligent Processing</span>
                </div>
              </Link>
            )}
            {collapsed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
                <span className="text-sm font-bold text-primary-foreground">AI</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const badgeCount = getBadgeCount(item.badgeKey)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badgeCount !== undefined && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Collapse Toggle - Desktop only */}
          <div className="hidden lg:block border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={toggleCollapsed}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Logout */}
          <div className="border-t border-sidebar-border p-2">
            <button
              onClick={handleSignOut}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center",
              )}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
