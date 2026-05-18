import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const pkg = createRequire(import.meta.url)('../package.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// write .debug.env
const envEntries = { ...pkg.debug.env }

// fnm Node 优先，避免 brew Node 的 icu4c 兼容问题
const fnmDefault = path.join(process.env.HOME, '.local/share/fnm/aliases/default/bin')
if (fs.existsSync(fnmDefault)) {
  envEntries.PATH = `${fnmDefault}:${process.env.PATH || ''}`
}

const envContent = Object.entries(envEntries).map(([key, val]) => `${key}=${val}`)
fs.writeFileSync(path.join(__dirname, '.debug.env'), envContent.join('\n'))

// bootstrap
spawn(
  // TODO: terminate `npm run dev` when Debug exits.
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev'],
  {
    stdio: 'inherit',
    env: Object.assign(process.env, { VSCODE_DEBUG: 'true' }),
  },
)
