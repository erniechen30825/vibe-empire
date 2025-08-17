import type React from "react"
// app/layout.tsx
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

import Header from "@/components/header"
import { QueryProvider } from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"

export const metadata: Metadata = {
  title: "Empire",
  description: "Personal growth planner",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      {/* darker sand backdrop, darker ink text by default */}
      <body className="min-h-screen bg-sand/30 text-ink antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <QueryProvider>
            {/* top border accent using brand; more visible */}
            <div className="h-1 w-full bg-brand" />
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
