"use client"

import type React from "react"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { toast } from "sonner"
import { X } from "lucide-react"

interface Category {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

interface CategoryFormProps {
  mode: "create" | "edit"
  category?: Category
  prefilledParentId?: string | null
  availableParents: Category[]
  onClose: () => void
}

export function CategoryForm({ mode, category, prefilledParentId, availableParents, onClose }: CategoryFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(category?.name || "")
  const [parentId, setParentId] = useState<string | null>(prefilledParentId || category?.parent_id || null)

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      const supabase = getSupabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: name.trim(),
        parent_id: parentId === "none" ? null : parentId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Category created")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      onClose()
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("A category with this name already exists under this parent")
      } else {
        toast.error("Failed to create category")
      }
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, parentId }: { id: string; name: string; parentId: string | null }) => {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          parent_id: parentId === "none" ? null : parentId,
        })
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Category updated")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      onClose()
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("A category with this name already exists under this parent")
      } else {
        toast.error("Failed to update category")
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Category name is required")
      return
    }

    if (mode === "create") {
      createMutation.mutate({ name, parentId })
    } else if (category) {
      updateMutation.mutate({ id: category.id, name, parentId })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isParentCategory = category && !category.parent_id

  // Filter out the current category from available parents to prevent circular references
  const filteredParents = availableParents.filter((parent) => parent.id !== category?.id)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md rounded-2xl border border-ink/10 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-ink">{mode === "create" ? "New Category" : "Edit Category"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 hover:bg-ink/5">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-ink">
                Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
                className="focus-visible:ring-brand/40"
                disabled={isPending}
                required
              />
            </div>

            {/* Parent Selection */}
            <div className="space-y-2">
              <label htmlFor="parent" className="text-sm font-medium text-ink">
                Parent Category
              </label>
              <select
                id="parent"
                value={parentId || "none"}
                onChange={(e) => setParentId(e.target.value === "none" ? null : e.target.value)}
                className="w-full px-3 py-2 border border-ink/20 rounded-md bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-transparent"
                disabled={isPending || (prefilledParentId && mode === "create")}
              >
                <option value="none">None (Top-level category)</option>
                {filteredParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
              {prefilledParentId && mode === "create" && (
                <p className="text-xs text-ink/60">Creating subcategory under selected parent</p>
              )}
              {isParentCategory && mode === "edit" && (
                <p className="text-xs text-ink/60">Parent categories cannot be moved under other categories</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !name.trim()}
                className="flex-1 bg-brand hover:bg-brand/90 text-white"
              >
                {isPending ? "Saving..." : mode === "create" ? "Create" : "Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
