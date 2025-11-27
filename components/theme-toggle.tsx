"use client"

import * as React from "react"
import { Moon, Sun, Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const accentColors = [
  { name: "Blue", hue: 250, class: "bg-blue-500" },
  { name: "Purple", hue: 280, class: "bg-purple-500" },
  { name: "Green", hue: 145, class: "bg-green-500" },
  { name: "Orange", hue: 35, class: "bg-orange-500" },
  { name: "Red", hue: 25, class: "bg-red-500" },
  { name: "Cyan", hue: 200, class: "bg-cyan-500" },
  { name: "Pink", hue: 330, class: "bg-pink-500" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [accentHue, setAccentHue] = React.useState(250)

  React.useEffect(() => {
    setMounted(true)
    // Load saved accent color
    const savedHue = localStorage.getItem("accent-hue")
    if (savedHue) {
      setAccentHue(parseInt(savedHue))
      applyAccentColor(parseInt(savedHue))
    }
  }, [])

  const applyAccentColor = (hue: number) => {
    const root = document.documentElement
    // Update primary color hue
    root.style.setProperty("--primary", `oklch(0.55 0.2 ${hue})`)
    root.style.setProperty("--ring", `oklch(0.55 0.2 ${hue})`)
    root.style.setProperty("--chart-1", `oklch(0.55 0.2 ${hue})`)
    root.style.setProperty("--sidebar-primary", `oklch(0.55 0.2 ${hue})`)
    root.style.setProperty("--sidebar-ring", `oklch(0.55 0.2 ${hue})`)

    // For dark theme, use lighter values
    if (theme === "dark") {
      root.style.setProperty("--primary", `oklch(0.65 0.2 ${hue})`)
      root.style.setProperty("--ring", `oklch(0.65 0.2 ${hue})`)
      root.style.setProperty("--chart-1", `oklch(0.65 0.2 ${hue})`)
      root.style.setProperty("--sidebar-primary", `oklch(0.65 0.2 ${hue})`)
      root.style.setProperty("--sidebar-ring", `oklch(0.65 0.2 ${hue})`)
    }
  }

  const handleAccentChange = (hue: number) => {
    setAccentHue(hue)
    localStorage.setItem("accent-hue", hue.toString())
    applyAccentColor(hue)
  }

  // Re-apply accent when theme changes
  React.useEffect(() => {
    if (mounted) {
      applyAccentColor(accentHue)
    }
  }, [theme, mounted, accentHue])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          Theme
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light
          </span>
          {theme === "light" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark
          </span>
          {theme === "dark" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            System
          </span>
          {theme === "system" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Accent Color
        </DropdownMenuLabel>
        <div className="px-2 py-2">
          <div className="flex flex-wrap gap-2">
            {accentColors.map((color) => (
              <button
                key={color.hue}
                onClick={() => handleAccentChange(color.hue)}
                className={cn(
                  "h-6 w-6 rounded-full transition-all hover:scale-110",
                  color.class,
                  accentHue === color.hue && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                )}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
