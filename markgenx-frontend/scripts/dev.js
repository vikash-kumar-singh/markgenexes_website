import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectDirectory = path.resolve(frontendDirectory, '..')
const backendDirectory = path.join(projectDirectory, 'backend')
const backendEntry = path.join(backendDirectory, 'index.js')
const viteEntry = path.join(frontendDirectory, 'node_modules', 'vite', 'bin', 'vite.js')
const healthUrl = 'http://127.0.0.1:8000/api/v1/public/tracking'

let backend
let vite
let shuttingDown = false

function isBackendReady() {
  return new Promise((resolve) => {
    const request = http.get(healthUrl, { timeout: 1500 }, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 500)
    })
    request.on('timeout', () => request.destroy())
    request.on('error', () => resolve(false))
  })
}

async function waitForBackend(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isBackendReady()) return
    if (backend?.exitCode != null) {
      throw new Error(`Backend stopped during startup (exit code ${backend.exitCode}).`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Backend did not become ready on port 8000 within 90 seconds.')
}

function stop(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  if (vite?.exitCode == null) vite.kill()
  if (backend?.exitCode == null) backend.kill()
  process.exitCode = exitCode
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

try {
  if (!(await isBackendReady())) {
    console.log('Starting backend and waiting for http://127.0.0.1:8000 ...')
    backend = spawn(process.execPath, [backendEntry], {
      cwd: backendDirectory,
      env: process.env,
      stdio: 'inherit',
    })
    await waitForBackend()
  } else {
    console.log('Backend is already running on port 8000.')
  }

  console.log('Backend is ready. Starting Vite ...')
  vite = spawn(process.execPath, [viteEntry], {
    cwd: frontendDirectory,
    env: process.env,
    stdio: 'inherit',
  })

  vite.on('exit', (code) => stop(code ?? 0))
  backend?.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`Backend stopped unexpectedly (exit code ${code}).`)
      stop(code || 1)
    }
  })
} catch (error) {
  console.error(error.message)
  stop(1)
}
