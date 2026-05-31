import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const venvPython =
  process.platform === 'win32'
    ? join(root, '.venv', 'Scripts', 'python.exe')
    : join(root, '.venv', 'bin', 'python')
const versionCheck =
  'import sys; raise SystemExit(0 if (3, 10) <= sys.version_info < (3, 13) else 1)'

const children = []
let shuttingDown = false

function findPython() {
  if (existsSync(venvPython)) {
    const venvCandidate = { command: venvPython, prefix: [] }
    if (isUsablePython(venvCandidate)) return venvCandidate

    console.warn('[designer-ai] Existing .venv uses an unsupported Python version.')
    console.warn('[designer-ai] Delete .venv, install Python 3.12, and run "npm run setup:python".')
    return null
  }

  const candidates =
    process.platform === 'win32'
      ? [
          { command: process.env.PYTHON, prefix: [] },
          { command: 'py', prefix: ['-3'] },
          { command: 'python', prefix: [] },
        ]
      : [
          { command: process.env.PYTHON, prefix: [] },
          { command: 'python3', prefix: [] },
          { command: 'python', prefix: [] },
        ]

  for (const candidate of candidates) {
    if (!candidate.command) continue

    if (isUsablePython(candidate)) return candidate
  }

  return null
}

function isUsablePython(candidate) {
  const result = spawnSync(candidate.command, [...candidate.prefix, '-c', versionCheck], {
    cwd: root,
    stdio: 'ignore',
  })

  return result.status === 0
}

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
  })

  children.push(child)

  child.on('error', (error) => {
    console.warn(`[${name}] ${error.message}`)
    if (name === 'designer-ai') {
      console.warn('[designer-ai] Run "npm run setup:python" before using the garden designer.')
    }
  })

  child.on('exit', (code) => {
    if (shuttingDown) return

    if (name === 'designer-ai') {
      console.warn(`[designer-ai] stopped with code ${code}. The web app will keep running.`)
      console.warn('[designer-ai] Run "npm run setup:python" if background removal is unavailable.')
      return
    }

    shutdown(code ?? 0)
  })
}

function shutdown(code = 0) {
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) child.kill()
  }

  process.exit(code)
}

process.on('SIGINT', () => shutdown())
process.on('SIGTERM', () => shutdown())

const python = findPython()

if (python) {
  start('designer-ai', python.command, [...python.prefix, 'resources/py/garden.py'])
} else {
  console.warn('[designer-ai] Python 3.10, 3.11, or 3.12 was not found.')
  console.warn('[designer-ai] Install Python 3.12 and run "npm run setup:python" before using background removal.')
}

start('web', process.execPath, ['ace', 'serve', '--hmr'])
