"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Folder, FolderOpen, Plus } from "lucide-react"

interface Category {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

interface CategoryRowProps {
  category: Category
  isParent: boolean
  subcategoryCount?: number
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
  onAddSubcategory?: (parentId: string) => void
  isDeleting: boolean
}

export function CategoryRow({
  category,
  isParent,
  subcategoryCount = 0,
  onEdit,
  onDelete,
  onAddSubcategory,
  isDeleting,
}: CategoryRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-sand/10 transition-colors group">
      <div className="flex items-center gap-3">
        {isParent ? <FolderOpen className="w-5 h-5 text-brand" /> : <Folder className="w-4 h-4 text-mint ml-1" />}

        <div className="flex items-center gap-2">
          <span className={`font-medium text-ink ${isParent ? "text-base" : "text-sm"}`}>{category.name}</span>

          {isParent && subcategoryCount > 0 && (
            <Badge variant="secondary" className="bg-sand/60 text-ink text-xs">
              {subcategoryCount} subcategories
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isParent && onAddSubcategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddSubcategory(category.id)}
            className="rounded-full text-brand hover:bg-brand/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add subcategory
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full" disabled={isDeleting}>
              <MoreVertical className="w-4 h-4" />
              <span className="sr-only">Category actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => onEdit(category)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(category.id)}
              className="text-red-600 focus:text-red-600"
              disabled={isDeleting}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
