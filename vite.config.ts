import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// GitHub Pages：构建时用 VITE_BASE=/quiz-lab/<app>/ 注入子路径；本地开发默认 '/'
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
