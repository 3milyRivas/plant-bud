import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const venvPath = join(root, '.venv')
const venvPython =
  process.platform === 'win32'
    ? join(venvPath, 'Scripts', 'python.exe')
    : join(venvPath, 'bin', 'python')
const versionCheck =
  'import sys; raise SystemExit(0 if (3, 10) <= sys.version_info < (3, 13) else 1)'

const hasVenvPython = existsSync(venvPython)
const venvCandidate = { command: venvPython, prefix: [] }

if (hasVenvPython && !isSupportedPython(venvCandidate)) {
  console.error('The existing .venv uses an unsupported Python version.')
  console.error('Plant Bud AI dependencies require Python 3.10, 3.11, or 3.12.')
  console.error('Delete .venv, install Python 3.12, and rerun:')
  console.error('npm run setup:python')
  process.exit(1)
}

function findPython() {
  if (hasVenvPython) return venvCandidate

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

    if (isSupportedPython(candidate)) return candidate
  }

  return null
}

function isSupportedPython(candidate) {
  const result = spawnSync(candidate.command, [...candidate.prefix, '-c', versionCheck], {
    cwd: root,
    stdio: 'ignore',
  })

  return result.status === 0
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const python = findPython()

if (!python) {
  console.error('Python 3.10, 3.11, or 3.12 was not found.')
  console.error('Install Python 3.12 from https://www.python.org/downloads/ and rerun:')
  console.error('npm run setup:python')
  console.error('If .venv already exists with another Python version, delete .venv and rerun setup:python.')
  process.exit(1)
}

if (!existsSync(venvPath)) {
  run(python.command, [...python.prefix, '-m', 'venv', '.venv'])
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'])
run(venvPython, ['resources/py/warmup_rembg.py'])

console.log('Python AI environment is ready')
