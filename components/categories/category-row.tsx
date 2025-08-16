"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, FolderOpen, Edit, Trash2, Plus } from "lucide-react"
import { useState } from "react"

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
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-sand/20 transition-colors group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-3">
        {isParent ? <FolderOpen className="w-5 h-5 text-brand" /> : <Folder className="w-4 h-4 text-mint" />}

        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{category.name}</span>
          {isParent && subcategoryCount > 0 && (
            <Badge variant="secondary" className="bg-sand text-ink text-xs">
              {subcategoryCount} subcategories
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className={`flex items-center gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        {isParent && onAddSubcategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddSubcategory(category.id)}
            className="h-8 px-2 hover:bg-mint/20 text-ink"
            title="Add subcategory"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(category)}
          className="h-8 px-2 hover:bg-brand/20 text-ink"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(category.id)}
          disabled={isDeleting}
          className="h-8 px-2 hover:bg-red-100 text-ink hover:text-red-600"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
