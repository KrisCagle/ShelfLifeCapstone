import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  // `npm run dev:phone`: serve over https on the local network. Phone browsers only
  // allow the camera on secure pages, so this is how to test the scanner on a real
  // phone. Uses a self-signed certificate, so the phone shows a warning once.
  const phone = mode === 'phone'

  return {
    plugins: [react(), ...(phone ? [basicSsl()] : [])],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // The scanner is lazy-loaded; pre-bundle its dependency so opening it the first
    // time in dev doesn't trigger a full page reload.
    optimizeDeps: {
      include: ['barcode-detector/ponyfill'],
    },
    server: {
      host: phone,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
