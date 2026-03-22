import { readFile } from 'node:fs/promises'
import { ok, err, fromThrowable, ResultAsync } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import type { AllowlistConfig, AllowlistMode, CheckResult, GatekeeperError } from './types.js'
import { ALLOWLIST_MODES } from './types.js'

const safeJsonParse = fromThrowable(
  (text: string) => JSON.parse(text) as unknown,
  (e): GatekeeperError => ({
    kind: 'CONFIG_ERROR',
    message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
  })
)

function isRecord (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray (value: unknown): value is ReadonlyArray<string> {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function validateConfig (data: unknown): Result<AllowlistConfig, GatekeeperError> {
  if (!isRecord(data)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Config must be a JSON object' })
  }

  const mode = data.mode ?? 'allowlist'
  if (typeof mode !== 'string' || !ALLOWLIST_MODES.includes(mode as AllowlistMode)) {
    return err({ kind: 'CONFIG_ERROR', message: `Invalid mode: "${String(mode)}". Must be "allowlist" or "blocklist"` })
  }

  const allowed = data.allowed ?? []
  if (!isStringArray(allowed)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Field "allowed" must be an array of strings' })
  }

  const blocked = data.blocked ?? []
  if (!isStringArray(blocked)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Field "blocked" must be an array of strings' })
  }

  return ok({
    allowed: allowed as ReadonlyArray<string>,
    blocked: blocked as ReadonlyArray<string>,
    mode: mode as AllowlistMode
  })
}

export function loadAllowlist (filePath: string): ResultAsync<AllowlistConfig, GatekeeperError> {
  return ResultAsync.fromPromise(
    readFile(filePath, 'utf-8'),
    (): GatekeeperError => ({
      kind: 'CONFIG_ERROR',
      message: `Failed to read allowlist file: ${filePath}`
    })
  )
    .andThen((content): Result<AllowlistConfig, GatekeeperError> => {
      const parsed = safeJsonParse(content)
      if (parsed.isErr()) return err(parsed.error)
      return validateConfig(parsed.value)
    })
}

function globToRegex (pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

function matchesPattern (packageName: string, pattern: string): boolean {
  if (pattern === '*') return true
  if (pattern.includes('*')) {
    return globToRegex(pattern).test(packageName)
  }
  return packageName === pattern
}

function matchesAny (packageName: string, patterns: ReadonlyArray<string>): boolean {
  return patterns.some((pattern) => matchesPattern(packageName, pattern))
}

export function checkPackage (config: AllowlistConfig, packageName: string): CheckResult {
  const modeHandlers: Readonly<Record<AllowlistMode, () => CheckResult>> = {
    allowlist: () => {
      // In allowlist mode, check blocked first (blocked overrides allowed)
      if (matchesAny(packageName, config.blocked)) {
        return {
          allowed: false,
          package: packageName,
          reason: `Package "${packageName}" is explicitly blocked`
        }
      }
      if (matchesAny(packageName, config.allowed)) {
        return {
          allowed: true,
          package: packageName,
          reason: `Package "${packageName}" is in the allowlist`
        }
      }
      return {
        allowed: false,
        package: packageName,
        reason: `Package "${packageName}" is not in the allowlist`
      }
    },
    blocklist: () => {
      if (matchesAny(packageName, config.blocked)) {
        return {
          allowed: false,
          package: packageName,
          reason: `Package "${packageName}" is in the blocklist`
        }
      }
      return {
        allowed: true,
        package: packageName,
        reason: `Package "${packageName}" is not blocked`
      }
    }
  }

  return modeHandlers[config.mode]()
}

export function checkPackages (
  config: AllowlistConfig,
  packages: ReadonlyArray<string>
): ReadonlyArray<CheckResult> {
  return packages.map((pkg) => checkPackage(config, pkg))
}
