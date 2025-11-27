"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { fieldsApi } from "@/lib/api/client"
import { Edit2, Check, X, AlertTriangle, ChevronDown, ChevronRight, Sparkles, Loader2 } from "lucide-react"
import type { ExtractedField } from "@/lib/types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"

interface FieldExtractionPanelProps {
  fields: ExtractedField[]
  onFieldUpdate?: (id: string, value: string) => void
}

interface FieldSuggestion {
  fieldId: string
  currentValue: string
  suggestedValues: Array<{
    value: string
    confidence: number
    reasoning: string
  }>
  validationHints: string[]
}

const categoryConfig = {
  patient: { label: "Patient Information", icon: "👤" },
  provider: { label: "Provider Information", icon: "🏥" },
  claim: { label: "Claim Information", icon: "📋" },
  codes: { label: "Codes & Amounts", icon: "💰" },
}

export function FieldExtractionPanel({ fields, onFieldUpdate }: FieldExtractionPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [openCategories, setOpenCategories] = useState<string[]>(["patient", "provider", "claim", "codes"])
  const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, FieldSuggestion>>({})

  const groupedFields = fields.reduce(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = []
      acc[field.category].push(field)
      return acc
    },
    {} as Record<string, ExtractedField[]>,
  )

  const startEdit = (field: ExtractedField) => {
    setEditingField(field.id)
    setEditValue(field.value)
  }

  const saveEdit = (id: string) => {
    onFieldUpdate?.(id, editValue)
    setEditingField(null)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue("")
  }

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))
  }

  const fetchSuggestions = async (fieldId: string) => {
    if (suggestions[fieldId]) return // Already loaded

    setLoadingSuggestions(fieldId)
    try {
      const response = await fieldsApi.getSuggestions(fieldId)
      if (response.data) {
        setSuggestions(prev => ({ ...prev, [fieldId]: response.data as FieldSuggestion }))
      }
    } catch (error) {
      toast.error("Failed to load suggestions")
    } finally {
      setLoadingSuggestions(null)
    }
  }

  const applySuggestion = (fieldId: string, value: string) => {
    onFieldUpdate?.(fieldId, value)
    toast.success("Suggestion applied")
  }

  const lowConfidenceCount = fields.filter((f) => f.confidence < 80).length

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-card-foreground">Extracted Fields</CardTitle>
          {lowConfidenceCount > 0 && (
            <div className="flex items-center gap-1.5 text-warning text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{lowConfidenceCount} low confidence</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(categoryConfig).map(([category, config]) => {
          const categoryFields = groupedFields[category] || []
          if (categoryFields.length === 0) return null

          const isOpen = openCategories.includes(category)

          return (
            <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <span>{config.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-1">
                {categoryFields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      field.confidence < 80 && "bg-warning/5 border border-warning/20",
                      field.isEdited && "bg-success/5 border border-success/20",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{field.label}</span>
                        {field.confidence < 80 && <AlertTriangle className="h-3 w-3 text-warning" />}
                        {field.isEdited && <span className="text-xs text-success">Edited</span>}
                      </div>
                      {editingField === field.id ? (
                        <div className="mt-1 flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 bg-input text-sm"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                            onClick={() => saveEdit(field.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          field.confidence >= 90 && "text-success",
                          field.confidence >= 80 && field.confidence < 90 && "text-foreground",
                          field.confidence < 80 && "text-warning",
                        )}
                      >
                        {field.confidence}%
                      </span>

                      {/* AI Suggestions Button for low confidence fields */}
                      {field.confidence < 80 && editingField !== field.id && (
                        <Popover onOpenChange={(open) => open && fetchSuggestions(field.id)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary"
                              title="Get AI suggestions"
                            >
                              {loadingSuggestions === field.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="end">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h4 className="font-medium text-sm">AI Suggestions</h4>
                              </div>

                              {loadingSuggestions === field.id ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-10 w-full" />
                                  <Skeleton className="h-10 w-full" />
                                </div>
                              ) : suggestions[field.id] ? (
                                <>
                                  {suggestions[field.id].suggestedValues.length > 0 ? (
                                    <div className="space-y-2">
                                      {suggestions[field.id].suggestedValues.map((suggestion, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-lg border border-border p-2 hover:bg-secondary/50 cursor-pointer transition-colors"
                                          onClick={() => applySuggestion(field.id, suggestion.value)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <code className="text-sm font-medium text-primary">{suggestion.value}</code>
                                            <Badge variant="secondary" className="text-xs">
                                              {suggestion.confidence}%
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">{suggestion.reasoning}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No alternative suggestions available</p>
                                  )}

                                  {suggestions[field.id].validationHints.length > 0 && (
                                    <div className="border-t border-border pt-2 mt-2">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Validation hints:</p>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {suggestions[field.id].validationHints.map((hint, idx) => (
                                          <li key={idx} className="flex items-start gap-1">
                                            <span className="text-primary">-</span>
                                            {hint}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Loading suggestions...</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {editingField !== field.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(field)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )
        })}

        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No fields extracted yet</p>
            <p className="text-xs text-muted-foreground mt-1">Fields will appear after document processing</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
