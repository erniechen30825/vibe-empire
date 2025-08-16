"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { MoreVertical, FolderOpen, Folder, ChevronDown, ChevronRight, Tags } from "lucide-react"
import CategoryForm from "@/components/categories/category-form"

type Category = {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  created_at?: string
}

export default function CategoriesPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const qc = useQueryClient()

  const [authChecking, setAuthChecking] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (!data.session) {
        router.push("/login")
      } else {
        setAuthChecking(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [router, supabase])

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
    enabled: !authChecking,
  })

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      // Check if category has children
      const { data: children } = await supabase.from("categories").select("id").eq("parent_id", categoryId).limit(1)

      if (children && children.length > 0) {
        throw new Error("Cannot delete category with subcategories. Delete subcategories first.")
      }

      // Check if category is used by goals
      const { data: goals } = await supabase.from("goals").select("id").eq("category_id", categoryId).limit(1)

      if (goals && goals.length > 0) {
        throw new Error("Cannot delete category that is used by goals. Move or delete goals first.")
      }

      const { error } = await supabase.from("categories").delete().eq("id", categoryId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category deleted!")
    },
    onError: (err: any) => {
      toast.error("Failed to delete category", {
        description: err?.message ?? "Please try again.",
      })
    },
  })

  const onEdit = (categoryId: string) => {
    setEditCategoryId(categoryId)
    setOpenForm(true)
  }

  const onCreate = () => {
    setEditCategoryId(null)
    setOpenForm(true)
  }

  const onDelete = (categoryId: string) => {
    deleteCategory.mutate(categoryId)
  }

  const toggleExpanded = (parentId: string) => {
    const newExpanded = new Set(expandedParents)
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId)
    } else {
      newExpanded.add(parentId)
    }
    setExpandedParents(newExpanded)
  }

  const categories = categoriesQuery.data ?? []
  const parentCategories = categories.filter((c) => c.parent_id === null)
  const childCategories = categories.filter((c) => c.parent_id !== null)

  const getChildren = (parentId: string) => {
    return childCategories.filter((c) => c.parent_id === parentId)
  }

  if (authChecking) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-ink">Categories</h1>
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
          <Separator className="my-6" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 to-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-mint/20 text-mint">
              <Tags className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold text-ink">Categories</h1>
          </div>
          <Button
            className="rounded-full bg-mint text-ink hover:bg-mint/80 focus-visible:ring-mint/40"
            onClick={onCreate}
          >
            New Category
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="max-w-2xl">
          {categoriesQuery.isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : parentCategories.length > 0 ? (
            <div className="grid gap-2">
              {parentCategories.map((parent) => {
                const children = getChildren(parent.id)
                const isExpanded = expandedParents.has(parent.id)
                const hasChildren = children.length > 0

                return (
                  <div key={parent.id} className="grid gap-1">
                    {/* Parent Category */}
                    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full p-1 h-auto"
                              onClick={() => toggleExpanded(parent.id)}
                              disabled={!hasChildren}
                            >
                              {hasChildren ? (
                                isExpanded ? (
                                  <ChevronDown className="size-4 text-ink/70" />
                                ) : (
                                  <ChevronRight className="size-4 text-ink/70" />
                                )
                              ) : (
                                <div className="size-4" />
                              )}
                            </Button>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="size-4 text-mint" />
                              <span className="font-medium text-ink">{parent.name}</span>
                              {hasChildren && (
                                <span className="text-xs text-ink/50 bg-mint/20 px-2 py-0.5 rounded-full">
                                  {children.length} subcategories
                                </span>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => onEdit(parent.id)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(parent.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Child Categories */}
                    {isExpanded && hasChildren && (
                      <div className="ml-8 grid gap-1">
                        {children.map((child) => (
                          <Card key={child.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Folder className="size-4 text-brand" />
                                  <span className="text-sm text-ink">{child.name}</span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                      <MoreVertical className="size-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={() => onEdit(child.id)}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onDelete(child.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-ink">No categories yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink/70">
                Create your first category to organize your goals and tasks.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-ink">{editCategoryId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            mode={editCategoryId ? "edit" : "create"}
            categoryId={editCategoryId ?? undefined}
            onClose={() => {
              setOpenForm(false)
              setEditCategoryId(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  )
}
