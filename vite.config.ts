import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { eventApiPlugin } from './server/plugin'

export default defineConfig({
  plugins:[react(),eventApiPlugin()],
  resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}},
})
