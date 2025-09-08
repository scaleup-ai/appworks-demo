import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow dev hosts used during local development / tunneling
    allowedHosts: [
      'dev.scaleupai.tech',
      'scaleup.ai.tech',
      'service.scaleupai.tech'
    ],
  },
})