import { describe, it, expect } from 'vitest'
import { checkPackage, checkPackages } from '../allowlist.js'
import type { AllowlistConfig } from '../types.js'

const allowlistConfig: AllowlistConfig = {
  allowed: ['typescript', 'vitest', '@valencets/*', 'zod', 'postgres'],
  blocked: ['eval', 'exec-*'],
  mode: 'allowlist'
}

const blocklistConfig: AllowlistConfig = {
  allowed: [],
  blocked: ['eval', 'exec-*', 'malicious-*'],
  mode: 'blocklist'
}

describe('checkPackage', () => {
  describe('allowlist mode', () => {
    it('allows packages in the allowlist', () => {
      const result = checkPackage(allowlistConfig, 'typescript')
      expect(result.allowed).toBe(true)
      expect(result.package).toBe('typescript')
      expect(result.reason).toContain('allowlist')
    })

    it('denies packages not in the allowlist', () => {
      const result = checkPackage(allowlistConfig, 'lodash')
      expect(result.allowed).toBe(false)
      expect(result.package).toBe('lodash')
      expect(result.reason).toContain('not in the allowlist')
    })

    it('allows scoped packages matching glob pattern', () => {
      const result = checkPackage(allowlistConfig, '@valencets/core')
      expect(result.allowed).toBe(true)
    })

    it('allows any @valencets scoped package', () => {
      const result = checkPackage(allowlistConfig, '@valencets/anything')
      expect(result.allowed).toBe(true)
    })

    it('denies scoped packages not matching any pattern', () => {
      const result = checkPackage(allowlistConfig, '@types/node')
      expect(result.allowed).toBe(false)
    })

    it('denies explicitly blocked packages even if they match allowed', () => {
      const configWithOverlap: AllowlistConfig = {
        allowed: ['eval', 'safe-pkg'],
        blocked: ['eval'],
        mode: 'allowlist'
      }
      const result = checkPackage(configWithOverlap, 'eval')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('explicitly blocked')
    })

    it('denies packages matching blocked glob patterns', () => {
      const result = checkPackage(allowlistConfig, 'exec-shell')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('explicitly blocked')
    })
  })

  describe('blocklist mode', () => {
    it('allows packages not in the blocklist', () => {
      const result = checkPackage(blocklistConfig, 'lodash')
      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('not blocked')
    })

    it('denies packages in the blocklist', () => {
      const result = checkPackage(blocklistConfig, 'eval')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blocklist')
    })

    it('denies packages matching blocked glob patterns', () => {
      const result = checkPackage(blocklistConfig, 'malicious-pkg')
      expect(result.allowed).toBe(false)
    })

    it('allows anything not explicitly blocked', () => {
      const result = checkPackage(blocklistConfig, 'totally-fine')
      expect(result.allowed).toBe(true)
    })
  })
})

describe('checkPackages', () => {
  it('checks multiple packages at once', () => {
    const results = checkPackages(allowlistConfig, ['typescript', 'lodash', 'zod'])
    expect(results).toHaveLength(3)
    expect(results[0]!.allowed).toBe(true)
    expect(results[1]!.allowed).toBe(false)
    expect(results[2]!.allowed).toBe(true)
  })

  it('returns empty array for empty input', () => {
    const results = checkPackages(allowlistConfig, [])
    expect(results).toHaveLength(0)
  })

  it('reports all blocked packages', () => {
    const results = checkPackages(allowlistConfig, ['eval', 'exec-shell'])
    expect(results.every((r) => !r.allowed)).toBe(true)
  })
})
