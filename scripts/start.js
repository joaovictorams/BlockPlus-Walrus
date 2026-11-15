// Block+ (Walrus edition) launcher: one command for the API (back-end) + web app (front-end).
//
//   npm start          use saved settings (asks only for what is missing)
//   npm run setup      ask for every setting again
//
// All settings live in Walrus/back-end/.env. The web app receives the ones it
// needs as VITE_* variables.

import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import crypto from 'node:crypto'
import readline from 'node:readline'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACK = path.join(ROOT, 'back-end')
const FRONT = path.join(ROOT, 'front-end')
const ENV_FILE = path.join(BACK, '.env')
const WEB_PORT = 3000

const SETUP = process.argv.includes('--setup')
const TTY = process.stdin.isTTY
const IS_WIN = process.platform === 'win32'

const c = (n) => (s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s)
const bold = c(1), dim = c(2), red = c(31), green = c(32), yellow = c(33), blue = c(34), cyan = c(36)

const DEFAULTS = {
  SUI_NETWORK: 'testnet',
  WALRUS_PUBLISHER: 'https://publisher.walrus-testnet.walrus.space',
  WALRUS_AGGREGATOR: 'https://aggregator.walrus-testnet.walrus.space',
  WALRUS_EPOCHS: '5',
  REGISTRATION_FEE_SUI: '0.1',
}

// ---------------------------------------------------------------- prompts

function ask(question, { def = '' } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl.question(`${question}${def ? dim(` [${def}]`) : ''}: `, (a) => {
      rl.close()
      resolve(a.trim() || def)
    })
  })
}

async function askValid(question, validate, opts = {}) {
  for (;;) {
    const v = await ask(question, opts)
    const err = validate(v)
    if (!err) return v
    console.log(red(`  ${err}`))
  }
}

async function confirm(question, def = true) {
  const a = (await ask(`${question} ${dim(def ? '(Y/n)' : '(y/N)')}`)).toLowerCase()
  return a ? a.startsWith('y') : def
}

// ---------------------------------------------------------------- validation

const isSuiAddress = (v) => /^0x[0-9a-fA-F]{64}$/.test(v)
const vSuiAddress = (v) => (isSuiAddress(v) ? null : 'Expected a Sui address: 0x followed by 64 hex characters.')
const vOptionalSuiAddress = (v) => (!v || v === '-' || isSuiAddress(v) ? null : vSuiAddress(v))
const vUrl = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? null : 'Expected an http(s) URL.' } catch { return 'Expected an http(s) URL.' } }
const vEpochs = (v) => (/^\d+$/.test(v) && +v >= 1 && +v <= 53 ? null : 'Expected a whole number from 1 to 53 (testnet epochs are 1 day).')
const vFee = (v) => (/^\d+(\.\d{1,9})?$/.test(v) && +v > 0 ? null : 'Expected a positive SUI amount, e.g. 0.1')
const vNetwork = (v) => (['testnet', 'mainnet', 'devnet'].includes(v) ? null : 'Expected testnet, mainnet or devnet.')

// ---------------------------------------------------------------- .env

function readEnv() {
  const env = {}
  if (!fs.existsSync(ENV_FILE)) return env
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let v = m[2]
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

function writeEnv(env) {
  const order = ['JWT_SECRET', 'PORT', 'SUI_NETWORK', 'WALRUS_PUBLISHER', 'WALRUS_AGGREGATOR', 'WALRUS_EPOCHS',
    'WALRUS_SEND_OBJECT_TO', 'SUI_SERVICE_WALLET', 'REGISTRATION_FEE_SUI', 'WALRUS_ENCRYPTION_KEY']
  const keys = [...order.filter((k) => k in env), ...Object.keys(env).filter((k) => !order.includes(k))]
  fs.writeFileSync(ENV_FILE, keys.map((k) => `${k}="${String(env[k]).replace(/"/g, '\\"')}"`).join('\n') + '\n')
}

const short = (s) => (s && s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s)

async function configure() {
  const env = readEnv()
  for (const [k, v] of Object.entries(DEFAULTS)) if (!env[k]) env[k] = v
  const missing = isSuiAddress(env.SUI_SERVICE_WALLET || '') ? [] : ['SUI_SERVICE_WALLET']

  let prompt = SETUP || missing.length > 0
  if (!prompt && TTY) {
    console.log(`Saved settings: Walrus ${cyan(env.SUI_NETWORK)}, fee ${cyan(env.REGISTRATION_FEE_SUI + ' SUI')} to ${cyan(short(env.SUI_SERVICE_WALLET))}, ${cyan(env.WALRUS_EPOCHS)} epoch(s) per upload`)
    prompt = !(await confirm('Use these settings?'))
  }

  if (prompt) {
    if (!TTY) {
      console.error(red(`Missing settings in Walrus/back-end/.env: ${missing.join(', ')}. Run "npm run setup" in a terminal.`))
      process.exit(1)
    }
    console.log(bold('\nWalrus / Sui settings') + dim(' (saved to Walrus/back-end/.env, press Enter to keep a value)'))
    env.SUI_NETWORK = await askValid('  Sui network', vNetwork, { def: env.SUI_NETWORK })
    env.WALRUS_PUBLISHER = await askValid('  Walrus publisher URL (uploads)', vUrl, { def: env.WALRUS_PUBLISHER })
    env.WALRUS_AGGREGATOR = await askValid('  Walrus aggregator URL (downloads)', vUrl, { def: env.WALRUS_AGGREGATOR })
    env.WALRUS_EPOCHS = await askValid('  Storage epochs per upload (1 epoch = 1 day on testnet, max 53)', vEpochs, { def: env.WALRUS_EPOCHS })
    env.SUI_SERVICE_WALLET = await askValid('  Your Sui wallet address (receives the registration fee)', vSuiAddress, {
      def: isSuiAddress(env.SUI_SERVICE_WALLET || '') ? env.SUI_SERVICE_WALLET : '',
    })
    env.REGISTRATION_FEE_SUI = await askValid('  Registration fee in SUI', vFee, { def: env.REGISTRATION_FEE_SUI })
    const owner = await askValid(
      '  Owner of stored blobs (Sui address; "-" = the publisher keeps them)',
      vOptionalSuiAddress,
      { def: env.WALRUS_SEND_OBJECT_TO || env.SUI_SERVICE_WALLET }
    )
    env.WALRUS_SEND_OBJECT_TO = owner === '-' ? '' : owner
  }

  env.PORT = env.PORT || '5000'
  if (!env.JWT_SECRET || /^your_/i.test(env.JWT_SECRET)) env.JWT_SECRET = crypto.randomBytes(32).toString('hex')
  // Walrus blobs are public, so the API encrypts every file with this key.
  if (!/^[0-9a-fA-F]{64}$/.test(env.WALRUS_ENCRYPTION_KEY || '')) {
    env.WALRUS_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
    console.log(yellow('\nGenerated a new file encryption key (WALRUS_ENCRYPTION_KEY in Walrus/back-end/.env).'))
    console.log(yellow('Back it up: without it, files stored on Walrus can never be decrypted.\n'))
  }
  writeEnv(env)
  return env
}

// ---------------------------------------------------------------- processes

const children = []
let shuttingDown = false

function prefixed(label, color, stream, out) {
  let buf = ''
  stream.on('data', (d) => {
    buf += d.toString()
    const lines = buf.split(/\r?\n/)
    buf = lines.pop()
    for (const l of lines) out.write(`${color(`[${label}]`.padEnd(6))} ${l}\n`)
  })
}

function run(label, color, cmd, args, cwd, extraEnv = {}) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '1', ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] })
  prefixed(label, color, child.stdout, process.stdout)
  prefixed(label, color, child.stderr, process.stderr)
  child.on('exit', (code, sig) => { if (!shuttingDown) console.log(red(`[${label}] exited (${sig || code})`)) })
  child.on('error', (e) => console.log(red(`[${label}] failed to start: ${e.message}`)))
  children.push(child)
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  console.log('\nStopping Block+...')
  for (const ch of children) {
    if (ch.exitCode !== null) continue
    if (IS_WIN) spawnSync('taskkill', ['/pid', String(ch.pid), '/T', '/F'], { stdio: 'ignore' })
    else ch.kill('SIGTERM')
  }
  process.exit(code)
}

// The web app binds to ::1 on some systems and 127.0.0.1 on others, so try both.
async function portOpen(port) {
  return (await portOpenOn(port, '127.0.0.1')) || (await portOpenOn(port, '::1'))
}

function portOpenOn(port, host) {
  return new Promise((resolve) => {
    const s = net.connect({ port: Number(port), host })
    s.setTimeout(1000)
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('timeout', () => { s.destroy(); resolve(false) })
    s.once('error', () => resolve(false))
  })
}

async function waitForPort(port, ms) {
  const end = Date.now() + ms
  while (Date.now() < end && !shuttingDown) {
    if (await portOpen(port)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

function ensureDeps() {
  for (const dir of [BACK, FRONT]) {
    if (fs.existsSync(path.join(dir, 'node_modules'))) continue
    console.log(`Installing dependencies in ${path.basename(dir)}...`)
    const r = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: IS_WIN })
    if (r.status !== 0) {
      console.error(red(`npm install failed in ${path.basename(dir)}.`))
      process.exit(1)
    }
  }
}

async function checkWalrus(env) {
  for (const [name, url] of [['publisher', env.WALRUS_PUBLISHER], ['aggregator', env.WALRUS_AGGREGATOR]]) {
    try {
      const r = await fetch(`${url.replace(/\/+$/, '')}/v1/api`, { signal: AbortSignal.timeout(10000) })
      if (r.ok) console.log(green(`✓ Walrus ${name} reachable: ${url}`))
      else console.log(yellow(`⚠ Walrus ${name} answered HTTP ${r.status}: ${url}`))
    } catch (e) {
      console.log(yellow(`⚠ Walrus ${name} not reachable (${e.name === 'TimeoutError' ? 'timeout' : e.message}): ${url}`))
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  console.log(bold(blue('\n  Block+ ')) + dim('decentralized storage on Walrus\n'))
  ensureDeps()
  const env = await configure()

  for (const [name, port] of [['API', env.PORT], ['web app', WEB_PORT]]) {
    if (await portOpen(port)) {
      console.error(red(`Port ${port} (${name}) is already in use, probably by another Block+ run (CESS or Walrus) that is still open.`))
      console.error(red(IS_WIN
        ? `  Close it, or find it with: netstat -ano | findstr :${port}   and stop it with: taskkill /PID <pid> /F`
        : `  Close it, or stop it with: kill $(lsof -t -i :${port})`))
      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown())
  process.on('SIGTERM', () => shutdown())

  await checkWalrus(env)

  run('api', green, process.execPath, ['--env-file=.env', 'src/server.js'], BACK)
  run('web', cyan, process.execPath, [path.join(FRONT, 'node_modules', 'vite', 'bin', 'vite.js')], FRONT, {
    BLOCKPLUS_API_PORT: env.PORT,
    VITE_SUI_NETWORK: env.SUI_NETWORK,
    VITE_SUI_SERVICE_WALLET: env.SUI_SERVICE_WALLET,
    VITE_REGISTRATION_FEE_SUI: env.REGISTRATION_FEE_SUI,
  })

  waitForPort(env.PORT, 30000).then((ok) => ok && console.log(green(`✓ API is up at http://localhost:${env.PORT}`)))
  waitForPort(WEB_PORT, 60000).then(
    (ok) => ok && console.log(green(bold(`✓ Block+ (Walrus) is ready: open http://localhost:${WEB_PORT}`)) + dim('   (Ctrl+C to stop)'))
  )
}

main().catch((e) => {
  console.error(red('Error: ' + e.message))
  shutdown(1)
})
