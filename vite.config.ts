import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleAssistant } from './server/assistant.mjs'

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  return {
    plugins: [react(), tailwindcss(), {
      name: 'worldscope-assistant',
      configureServer(server) { server.middlewares.use('/api/assistant', (req, res) => { void handleAssistant(req, res, env) }) },
    }],
    build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'globe', test: /node_modules[\\/](three|d3|topojson)/ }] } } } },
  }
})
