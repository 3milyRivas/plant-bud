import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const envPath = join(root, '.env')
const envExamplePath = join(root, '.env.example')
const args = new Set(process.argv.slice(2))

const options = {
  skipEnv: args.has('--skip-env'),
  skipNode: args.has('--skip-node'),
  skipPython: args.has('--skip-python'),
  skipDb: args.has('--skip-db'),
  skipBots: args.has('--skip-bots'),
  skipBuild: args.has('--skip-build'),
  refreshBots: args.has('--refresh-bots'),
}

function section(title) {
  console.log(`\n== ${title} ==`)
}

function run(command, commandArgs, { optional = false } = {}) {
  const executable = commandForPlatform(command, commandArgs)
  const result = spawnSync(executable.command, executable.args, {
    cwd: root,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`Could not start "${command}": ${result.error.message}`)
  }

  if (result.status !== 0 && !optional) {
    process.exit(result.status ?? 1)
  }

  return result.status === 0
}

function commandForPlatform(command, commandArgs) {
  if (process.platform === 'win32' && command === 'npm') {
    return {
      command: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd', ...commandArgs],
    }
  }

  return { command, args: commandArgs }
}

function hasPackage(packageName) {
  return existsSync(join(root, 'node_modules', packageName, 'package.json'))
}

function setupEnvironment() {
  if (options.skipEnv) return

  section('Environment')

  if (!existsSync(envExamplePath)) {
    console.error('.env.example was not found.')
    process.exit(1)
  }

  const template = readFileSync(envExamplePath, 'utf8')
  const envAlreadyExisted = existsSync(envPath)
  let contents = envAlreadyExisted ? readFileSync(envPath, 'utf8') : template
  let environmentChanged = !envAlreadyExisted
  const templateEntries = parseEnvEntries(template)
  const currentEntries = parseEnvEntries(contents)
  const missingLines = []

  for (const [key, value] of templateEntries) {
    if (!currentEntries.has(key)) {
      missingLines.push(`${key}=${value}`)
    }
  }

  if (missingLines.length) {
    contents = `${contents.trimEnd()}\n\n# Added automatically by npm run setup\n${missingLines.join('\n')}\n`
    environmentChanged = true
  }

  if (!getEnvValue(contents, 'APP_KEY')) {
    contents = setEnvValue(contents, 'APP_KEY', randomBytes(24).toString('base64url'))
    environmentChanged = true
    console.log('Generated a new APP_KEY')
  }

  if (environmentChanged) {
    writeFileSync(envPath, normalizeLineEndings(contents), 'utf8')
  }

  console.log(envAlreadyExisted ? '.env is ready' : '.env created')
}

function parseEnvEntries(contents) {
  const entries = new Map()

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/)
    if (match) entries.set(match[1], match[2])
  }

  return entries
}

function getEnvValue(contents, key) {
  return parseEnvEntries(contents).get(key)?.trim() || ''
}

function setEnvValue(contents, key, value) {
  const pattern = new RegExp(`^\\s*${key}=.*$`, 'm')
  if (pattern.test(contents)) return contents.replace(pattern, `${key}=${value}`)
  return `${contents.trimEnd()}\n${key}=${value}\n`
}

function normalizeLineEndings(contents) {
  const normalized = `${contents.trimEnd()}\n`
  return process.platform === 'win32' ? normalized.replace(/\n/g, '\r\n') : normalized
}

function ensureNodeDependencies() {
  if (options.skipNode) return

  section('Node dependencies')

  const requiredPackages = ['@adonisjs/core', 'axios', 'better-sqlite3']
  const missingPackages = requiredPackages.filter((packageName) => !hasPackage(packageName))

  if (missingPackages.length) {
    console.log(`Missing packages detected: ${missingPackages.join(', ')}`)
  }

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

function buildApplication() {
  if (options.skipBuild) return

  section('Production build verification')
  run('npm', ['run', 'build'])
}

setupEnvironment()
ensureNodeDependencies()
setupPython()
setupDatabase()
setupDemoBots()
buildApplication()

console.log('\nPlant Bud setup is ready.')
console.log('Add PLANT_ID_API_KEYS and PEXELS_API_KEY to .env to enable external API features.')
console.log('Run "npm run dev" to start the application.')
