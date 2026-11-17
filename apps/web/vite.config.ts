import { defineConfig } from 'vite'
import EnvironmentPlugin from 'vite-plugin-environment'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Defaults point at the local API; real env vars / .env files override them.
    EnvironmentPlugin({
      VITE_ALBUM_ENDPOINT: 'http://localhost:3000/album',
      VITE_SINGLE_ENDPOINT: 'http://localhost:3000/single',
      VITE_TRACK_ENDPOINT: 'http://localhost:3000/track'
    })
  ],
  server: {
    host: true,
    port: 443
  }
})
