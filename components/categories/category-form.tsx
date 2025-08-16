"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type Mode = "create" | "edit"

type Category = {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  created_at?: string
}

export default function CategoryForm({
  mode,
  categoryId,
  onClose,
}: {
  mode: Mode
  categoryId?: string
  onClose: () => void
}) {
  const supabase = getSupabaseBrowser()
  const qc = useQueryClient()

  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,user_id,name,parent_id,created_at")
        .order("name", { ascending: true })
      if (error) throw error
      return (data as Category[]) ?? []
    },
  })

  // Load existing category data in edit mode
  const categoryQuery = useQuery({
    queryKey: ["categories", categoryId],
    queryFn: async (): Promise<Category | null> => {
      if (!categoryId) return null
      const { data, error } = await supabase
        .from("categories")
        .select("id,user_id,name,parent_id,created_at")
        .eq("id", categoryId)
        .maybeSingle()
      if (error) throw error
      return (data as Category) ?? null
    },
    enabled: mode === "edit" && !!categoryId,
  })

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && categoryQuery.data) {
      const category = categoryQuery.data
      setName(category.name ?? "")
      setParentId(category.parent_id ?? null)
    }
  }, [mode, categoryQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Category name is required")
      }

      // Check for duplicate names at the same level
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("name", name.trim())
        .eq("parent_id", parentId || null)
        .neq("id", categoryId || "")
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error("A category with this name already exists at this level")
      }

      const categoryData = {
        name: name.trim(),
        parent_id: parentId || null,
      }

      if (mode === "create") {
        const { error } = await supabase.from("categories").insert(categoryData)
        if (error) throw error
      } else if (mode === "edit" && categoryId) {
        const { error } = await supabase.from("categories").update(categoryData).eq("id", categoryId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] })
      toast.success(mode === "create" ? "Category created!" : "Category updated!")
      onClose()
    },
    onError: (err: any) => {
      toast.error("Save failed", {
        description: err?.message ?? "Please check your inputs and try again.",
      })
    },
  })

  const handleSave = () => {
    setPending(true)
    saveMutation.mutate()
    setPending(false)
  }

  // Get available parent categories (exclude current category and its descendants in edit mode)
  const availableParents = (categoriesQuery.data ?? []).filter((cat) => {
    // Only show parent categories (no parent_id)
    if (cat.parent_id !== null) return false

    // In edit mode, exclude the current category to prevent circular references
    if (mode === "edit" && categoryId === cat.id) return false

    return true
  })

  return (
    <div className="grid gap-4">
      {/* Name */}
      <div className="grid gap-2">
        <label htmlFor="category-name" className="text-sm font-medium text-ink">
          Name *
        </label>
        <Input
          id="category-name"
          placeholder="e.g., Work, Personal, Health"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="focus-visible:ring-brand/40"
          required
        />
      </div>

      {/* Parent Category */}
      <div className="grid gap-2">
        <label className="text-sm font-medium text-ink">Parent Category</label>
        <Select value={parentId ?? "none"} onValueChange={(value) => setParentId(value === "none" ? null : value)}>
          <SelectTrigger className="focus:ring-brand/40">
            <SelectValue placeholder="None (top-level category)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (top-level category)</SelectItem>
            {availableParents.map((parent) => (
              <SelectItem key={parent.id} value={parent.id}>
                {parent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-ink/60">
          Leave empty to create a top-level category, or select a parent to create a subcategory.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="ghost" className="rounded-full" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          className="rounded-full bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand/40"
          onClick={handleSave}
          disabled={pending || !name.trim()}
        >
          {pending ? "Saving..." : mode === "create" ? "Create Category" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
