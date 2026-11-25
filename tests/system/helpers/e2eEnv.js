import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../..')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function loadCurrentConfig() {
  const baseEnv = parseEnvFile(path.join(ROOT_DIR, '.env'))
  const e2eEnv = parseEnvFile(path.join(ROOT_DIR, '.env.e2e'))
  const pickEnv = (key, fallback = '') =>
    process.env[key] || e2eEnv[key] || baseEnv[key] || fallback

  return {
    apiBaseUrl: pickEnv(
      'E2E_API_BASE_URL',
      pickEnv('VITE_API_GATEWAY_URL', 'http://13.236.166.3:5000')
    ).replace(/\/+$/, ''),
    webBaseUrl: pickEnv('E2E_WEB_BASE_URL', 'http://localhost:5173').replace(/\/+$/, ''),
    adminCitizenId: pickEnv('E2E_ADMIN_CITIZEN_ID', '').trim(),
    adminPassword: pickEnv('E2E_ADMIN_PASSWORD', ''),
  }
}

export const E2E_CONFIG = {
  get apiBaseUrl() {
    return loadCurrentConfig().apiBaseUrl
  },
  get webBaseUrl() {
    return loadCurrentConfig().webBaseUrl
  },
  get adminCitizenId() {
    return loadCurrentConfig().adminCitizenId
  },
  get adminPassword() {
    return loadCurrentConfig().adminPassword
  },
}

export function hasRealAdminCredentials() {
  const cfg = loadCurrentConfig()
  return (
    /^\d{12}$/.test(cfg.adminCitizenId) &&
    Boolean(cfg.adminPassword) &&
    cfg.adminPassword !== 'YourAdminPasswordHere' &&
    cfg.adminPassword !== 'NHAP_MAT_KHAU_ADMIN_VAO_DAY'
  )
}
