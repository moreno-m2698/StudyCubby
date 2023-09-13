import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

let myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
console.log(process.env);



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 80
  }
})
