// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#85C7F2",  // Sky blue
        sand:  "#FEDC97",  // Sand yellow
        mint:  "#1AFFD5",  // Mint green
        ink:   "#615D6C",  // Slate/Ink

        primary: "#85C7F2",
        accent:  "#1AFFD5",
        warn:    "#FEDC97",
        textink: "#615D6C",
      },
    },
  },
  plugins: [],
}

export default config
