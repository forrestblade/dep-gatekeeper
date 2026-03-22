export const ALLOWLIST_MODES = ['allowlist', 'blocklist'] as const
export type AllowlistMode = typeof ALLOWLIST_MODES[number]

export interface AllowlistConfig {
  readonly allowed: ReadonlyArray<string>
  readonly blocked: ReadonlyArray<string>
  readonly mode: AllowlistMode
}

export interface CheckResult {
  readonly allowed: boolean
  readonly package: string
  readonly reason: string
}

export const GATEKEEPER_ERROR_KINDS = ['CONFIG_ERROR', 'PARSE_ERROR'] as const
export type GatekeeperErrorKind = typeof GATEKEEPER_ERROR_KINDS[number]

export interface GatekeeperError {
  readonly kind: GatekeeperErrorKind
  readonly message: string
}
