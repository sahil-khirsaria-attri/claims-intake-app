"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/context"
import { settingsApi } from "@/lib/api/client"
import {
  User,
  Bell,
  Shield,
  Database,
  Sliders,
  Save,
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  Link,
  Unlink,
  TestTube,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface Settings {
  notifications: {
    new_claims: boolean
    exceptions: boolean
    reviews: boolean
    reports: boolean
  }
  validation: {
    confidenceThreshold: number
    autoRouting: string
  }
  profile: {
    name: string
    email: string
    role: string
    department: string
  }
}

interface Integration {
  id: string
  name: string
  description: string
  type: "clearinghouse" | "ehr" | "payer" | "analytics"
  status: "connected" | "disconnected" | "pending"
  lastSync?: string
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState("profile")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      new_claims: true,
      exceptions: true,
      reviews: false,
      reports: true,
    },
    validation: {
      confidenceThreshold: 80,
      autoRouting: "recommended",
    },
    profile: {
      name: "",
      email: "",
      role: "",
      department: "Claims Processing",
    },
  })

  // Security state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isRevokingSessions, setIsRevokingSessions] = useState(false)

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loadingIntegration, setLoadingIntegration] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    const response = await settingsApi.get()
    if (response.data) {
      const data = response.data as Partial<Settings>
      setSettings((prev) => ({
        ...prev,
        ...(data.notifications && { notifications: { ...prev.notifications, ...data.notifications } }),
        ...(data.validation && { validation: { ...prev.validation, ...data.validation } }),
      }))
    }

    // Set profile from auth user
    if (user) {
      setSettings((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }))
    }
    setIsLoading(false)
  }, [user])

  const fetchIntegrations = useCallback(async () => {
    const response = await settingsApi.getIntegrations()
    if (response.data) {
      setIntegrations((response.data as { integrations: Integration[] }).integrations || [])
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchIntegrations()
  }, [fetchSettings, fetchIntegrations])

  const handleSave = async () => {
    setIsSaving(true)
    const response = await settingsApi.update({
      notifications: settings.notifications,
      validation: settings.validation,
    })

    setIsSaving(false)

    if (response.error) {
      toast.error("Failed to save settings")
    } else {
      toast.success("Settings saved successfully")
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    const response = await settingsApi.updateProfile({
      name: settings.profile.name,
      email: settings.profile.email,
      department: settings.profile.department,
    })

    setIsSaving(false)

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success("Profile updated successfully")
      refreshUser?.()
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsChangingPassword(true)
    const response = await settingsApi.changePassword(currentPassword, newPassword)
    setIsChangingPassword(false)

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  const handleRevokeSessions = async () => {
    setIsRevokingSessions(true)
    const response = await settingsApi.revokeSessions()
    setIsRevokingSessions(false)

    if (response.error) {
      toast.error(response.error)
    } else {
      toast.success("All sessions have been revoked")
    }
  }

  const handleIntegrationAction = async (
    integrationId: string,
    action: "connect" | "disconnect" | "test"
  ) => {
    setLoadingIntegration(integrationId)
    const response = await settingsApi.updateIntegration(integrationId, action)
    setLoadingIntegration(null)

    if (response.error) {
      toast.error(response.error)
    } else {
      if (action === "test") {
        toast.success("Connection test successful")
      } else {
        toast.success(action === "connect" ? "Integration connected" : "Integration disconnected")
        fetchIntegrations()
      }
    }
  }

  const toggleNotification = (key: keyof typeof settings.notifications) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }))
  }

  const updateProfile = (key: keyof typeof settings.profile, value: string) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, [key]: value },
    }))
  }

  const updateValidation = (key: keyof typeof settings.validation, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      validation: { ...prev.validation, [key]: value },
    }))
  }

  if (isLoading) {
    return (
      <AppShell title="Settings" subtitle="Manage your account and application preferences">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </AppShell>
    )
  }

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Profile Information</CardTitle>
                <CardDescription>Update your account details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={settings.profile.name}
                      onChange={(e) => updateProfile("name", e.target.value)}
                      className="bg-input text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateProfile("email", e.target.value)}
                      className="bg-input text-foreground"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-foreground">
                      Role
                    </Label>
                    <Select value={settings.profile.role} onValueChange={(v) => updateProfile("role", v)}>
                      <SelectTrigger className="bg-secondary text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intake_clerk">Intake Clerk</SelectItem>
                        <SelectItem value="validation_specialist">Validation Specialist</SelectItem>
                        <SelectItem value="human_reviewer">Human Reviewer</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-foreground">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={settings.profile.department}
                      onChange={(e) => updateProfile("department", e.target.value)}
                      className="bg-input text-foreground"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </>
        )

      case "notifications":
        return (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    id: "new_claims" as const,
                    label: "New claim assignments",
                    description: "Get notified when a claim is assigned to you",
                  },
                  {
                    id: "exceptions" as const,
                    label: "Exception alerts",
                    description: "Receive alerts for claims with validation failures",
                  },
                  {
                    id: "reviews" as const,
                    label: "Review completions",
                    description: "Notify when human reviews are completed",
                  },
                  {
                    id: "reports" as const,
                    label: "Daily reports",
                    description: "Receive daily summary of claims processed",
                  },
                ].map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{setting.label}</p>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch
                      checked={settings.notifications[setting.id]}
                      onCheckedChange={() => toggleNotification(setting.id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Notifications
                  </>
                )}
              </Button>
            </div>
          </>
        )

      case "security":
        return (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-input text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-input text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input text-foreground"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Session Management</CardTitle>
                <CardDescription>Manage your active sessions and sign out of other devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you suspect unauthorized access to your account, you can sign out of all sessions across
                  all devices.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleRevokeSessions}
                  disabled={isRevokingSessions}
                >
                  {isRevokingSessions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out All Devices
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )

      case "integrations":
        return (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Integrations</CardTitle>
              <CardDescription>Connect to external systems and services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{integration.name}</p>
                        <Badge
                          variant={integration.status === "connected" ? "default" : "secondary"}
                          className={
                            integration.status === "connected"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {integration.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {integration.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
                      {integration.lastSync && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last synced: {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.status === "connected" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIntegrationAction(integration.id, "test")}
                            disabled={loadingIntegration === integration.id}
                          >
                            {loadingIntegration === integration.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <TestTube className="mr-1 h-4 w-4" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleIntegrationAction(integration.id, "disconnect")}
                            disabled={loadingIntegration === integration.id}
                          >
                            {loadingIntegration === integration.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Unlink className="mr-1 h-4 w-4" />
                                Disconnect
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleIntegrationAction(integration.id, "connect")}
                          disabled={loadingIntegration === integration.id}
                        >
                          {loadingIntegration === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link className="mr-1 h-4 w-4" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )

      case "preferences":
        return (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Validation Preferences</CardTitle>
                <CardDescription>Configure validation thresholds and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Confidence Threshold</Label>
                    <Select
                      value={settings.validation.confidenceThreshold.toString()}
                      onValueChange={(v) => updateValidation("confidenceThreshold", parseInt(v))}
                    >
                      <SelectTrigger className="bg-secondary text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70% (More Lenient)</SelectItem>
                        <SelectItem value="80">80% (Standard)</SelectItem>
                        <SelectItem value="90">90% (Strict)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Fields below this threshold will be flagged for review
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Auto-routing</Label>
                    <Select
                      value={settings.validation.autoRouting}
                      onValueChange={(v) => updateValidation("autoRouting", v)}
                    >
                      <SelectTrigger className="bg-secondary text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off - Manual routing only</SelectItem>
                        <SelectItem value="recommended">Show recommendations</SelectItem>
                        <SelectItem value="auto">Auto-route clean claims</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How claims are routed after validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <AppShell title="Settings" subtitle="Manage your account and application preferences">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="border-border bg-card">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {[
                  { icon: User, label: "Profile", id: "profile" },
                  { icon: Bell, label: "Notifications", id: "notifications" },
                  { icon: Shield, label: "Security", id: "security" },
                  { icon: Database, label: "Integrations", id: "integrations" },
                  { icon: Sliders, label: "Preferences", id: "preferences" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">{renderContent()}</div>
      </div>
    </AppShell>
  )
}
