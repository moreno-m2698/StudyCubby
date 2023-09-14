import { defineConfig } from 'vite'
import EnvironmentPlugin from 'vite-plugin-environment'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin(['VITE_ALBUM_ENDPOINT', 'VITE_SINGLE_ENDPOINT', 'VITE_TRACK_ENDPOINT'])
  ],
  server: {
    host: true,
    port: 80
  }
})
