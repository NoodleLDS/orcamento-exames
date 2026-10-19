import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona em https://<usuario>.github.io/<repo>/ sem configurar o nome do repo
export default defineConfig({
  plugins: [react()],
  base: './',
})
