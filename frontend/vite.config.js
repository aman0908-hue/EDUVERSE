import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🚀 Requirement: frontend env file src/.env par rahegi
  envDir: 'src',
})
