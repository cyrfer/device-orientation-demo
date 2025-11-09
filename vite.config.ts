import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const devCertDir = path.resolve(__dirname, 'dev-certs')
if (!fs.existsSync(devCertDir)) {
  fs.mkdirSync(devCertDir, { recursive: true })
}

export default defineConfig({
  plugins: [mkcert({
    savePath: devCertDir,
    keyFileName: 'dev-key.pem',
    certFileName: 'dev-cert.pem',
    force: false
  })],
  base: '/device-orientation-demo/',
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2022'
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: (() => {
      const keyPath = path.join(devCertDir, 'dev-key.pem')
      const certPath = path.join(devCertDir, 'dev-cert.pem')
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        } as import('https').ServerOptions
      }
      // mkcert plugin may generate files at runtime; fallback to true and cast
      return true as unknown as import('https').ServerOptions
    })(),
    open: true
  }
})