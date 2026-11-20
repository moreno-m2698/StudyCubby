import { defineConfig } from 'vite'
import EnvironmentPlugin from 'vite-plugin-environment'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Defaults point at the local API; real env vars / .env files override them.
    EnvironmentPlugin({
      VITE_API_URL: 'http://localhost:3000',
      VITE_DEV_USER: ''
    })
  ],
  server: {
    host: true,
    port: 443
  }
})
