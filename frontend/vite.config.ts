import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // The Gemini backend is the Next.js app at the repo root (npm run dev → :3000).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
