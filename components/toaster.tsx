"use client"

import { Toaster as SonnerToaster, type ToasterProps } from "sonner"

// Simple wrapper so app/layout.tsx can import { Toaster } from "@/components/toaster"
export function Toaster(props: ToasterProps) {
  return <SonnerToaster position="top-right" richColors closeButton toastOptions={{ duration: 3500 }} {...props} />
}
