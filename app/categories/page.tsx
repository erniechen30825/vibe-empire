"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { CategoryForm } from "@/components/categories/category-form"
import { CategoryRow } from "@/components/categories/category-row"
import { toast } from "sonner"
import { Plus, FolderOpen } from "lucide-react"
import { useRequireAuth } from "@/hooks/use-require-auth"

interface Category {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

interface CategoriesData {
  parents: Category[]
  children: Record<string, Category[]>
}

export const dynamic = "force-dynamic"

export default function CategoriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, loading: authLoading } = useRequireAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [prefilledParentId, setPrefilledParentId] = useState<string | null>(null)

  // Fetch categories
  const {
    data: categoriesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoriesData> => {
      const supabase = getSupabaseBrowser()
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, created_at")
        .order("name", { ascending: true })

      if (error) throw error

      const parents = data.filter((cat) => !cat.parent_id)
      const children: Record<string, Category[]> = {}

      data
        .filter((cat) => cat.parent_id)
        .forEach((child) => {
          if (!children[child.parent_id!]) {
            children[child.parent_id!] = []
          }
          children[child.parent_id!].push(child)
        })

      return { parents, children }
    },
    enabled: !!user,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Category deleted")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (error: any) => {
      if (error.message?.includes("foreign key") || error.code === "23503") {
        toast.error("Category is in use by goals. Reassign or delete those first.")
      } else {
        toast.error("Failed to delete category")
      }
    },
  })

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setPrefilledParentId(null)
  }

  const handleAddSubcategory = (parentId: string) => {
    setPrefilledParentId(parentId)
    setShowCreateForm(true)
  }

  const handleDelete = (categoryId: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(categoryId)
    }
  }

  const handleFormClose = () => {
    setShowCreateForm(false)
    setEditingCategory(null)
    setPrefilledParentId(null)
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-ink/60">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="rounded-2xl border border-ink/10 bg-white/90">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Failed to load categories</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["categories"] })} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ink">Categories</h1>
        <Button onClick={() => setShowCreateForm(true)} className="bg-brand hover:bg-brand/90 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Card className="rounded-2xl border border-ink/10 bg-white/90">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !categoriesData?.parents.length ? (
        <Card className="rounded-2xl border border-ink/10 bg-white/90">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-ink/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">No categories yet</h3>
            <p className="text-ink/60 mb-6">Create your first category to organize your goals</p>
            <Button onClick={() => setShowCreateForm(true)} className="bg-brand hover:bg-brand/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create your first category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Parent Categories */}
          <Card className="rounded-2xl border border-ink/10 bg-white/90">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoriesData.parents.map((parent, index) => (
                <div key={parent.id}>
                  {index > 0 && <Separator className="my-4" />}

                  {/* Parent Row */}
                  <CategoryRow
                    category={parent}
                    isParent={true}
                    subcategoryCount={categoriesData.children[parent.id]?.length || 0}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddSubcategory={handleAddSubcategory}
                    isDeleting={deleteMutation.isPending}
                  />

                  {/* Subcategories */}
                  {categoriesData.children[parent.id] && (
                    <div className="ml-6 mt-3 space-y-2">
                      {categoriesData.children[parent.id].map((child) => (
                        <CategoryRow
                          key={child.id}
                          category={child}
                          isParent={false}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isDeleting={deleteMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Form Dialog */}
      {showCreateForm && (
        <CategoryForm
          mode="create"
          prefilledParentId={prefilledParentId}
          onClose={handleFormClose}
          availableParents={categoriesData?.parents || []}
        />
      )}

      {/* Edit Form Dialog */}
      {editingCategory && (
        <CategoryForm
          mode="edit"
          category={editingCategory}
          onClose={handleFormClose}
          availableParents={categoriesData?.parents || []}
        />
      )}
    </div>
  )
}
