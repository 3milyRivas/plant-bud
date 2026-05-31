import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const args = new Set(process.argv.slice(2))

const options = {
  skipNode: args.has('--skip-node'),
  skipPython: args.has('--skip-python'),
  skipDb: args.has('--skip-db'),
  skipBots: args.has('--skip-bots'),
  refreshBots: args.has('--refresh-bots'),
}

function section(title) {
  console.log(`\n== ${title} ==`)
}

function run(command, commandArgs, { optional = false } = {}) {
  const result = spawnSync(commandForPlatform(command), commandArgs, {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1)
  }

  return result.status === 0
}

function commandForPlatform(command) {
  if (process.platform !== 'win32') return command
  if (command === 'npm') return 'npm.cmd'

  return command
}

function hasPackage(packageName) {
  return existsSync(join(root, 'node_modules', packageName, 'package.json'))
}

function ensureNodeDependencies() {
  if (options.skipNode) return

  section('Node dependencies')

  const requiredPackages = ['@adonisjs/core', 'axios', 'better-sqlite3']
  const missingPackages = requiredPackages.filter((packageName) => !hasPackage(packageName))

  if (!missingPackages.length) {
    console.log('Node dependencies are ready')
    return
  }

  console.log(`Missing ${missingPackages.join(', ')}. Running npm install...`)
  run('npm', ['install'])
}

function setupPython() {
  if (options.skipPython) return

  section('Python AI environment')
  run('node', ['scripts/setup_python.mjs'])
}

function setupDatabase() {
  if (options.skipDb) return

  section('Database')
  run('node', ['ace', 'migration:run'])
}

function setupDemoBots() {
  if (options.skipBots) return

  section('Demo bots')

  const botArgs = ['ace', 'demo:bots']
  if (options.refreshBots) botArgs.push('--refresh')

  run('node', botArgs)
}

ensureNodeDependencies()
setupPython()
setupDatabase()
setupDemoBots()

console.log('\nPlant Bud setup is ready')
