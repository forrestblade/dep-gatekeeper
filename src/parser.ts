import type { Result } from '@valencets/resultkit'
import { ok } from '@valencets/resultkit'
import type { GatekeeperError } from './types.js'

interface ParsedInstall {
  readonly manager: string
  readonly packages: ReadonlyArray<string>
}

const INSTALL_PATTERNS: Readonly<Record<string, ReadonlyArray<string>>> = {
  npm: ['install', 'i', 'add'],
  pnpm: ['add', 'install', 'i'],
  yarn: ['add'],
  pip: ['install'],
  cargo: ['add']
}

function isFlag (token: string): boolean {
  return token.startsWith('-')
}

const FLAGS_WITH_VALUES: ReadonlyArray<string> = [
  '--features', '--registry', '--prefix', '--target', '--python'
]

function isFlagWithValue (token: string): boolean {
  return FLAGS_WITH_VALUES.includes(token)
}

function isPackageName (token: string): boolean {
  if (isFlag(token)) return false
  // Package names don't start with . or / (those are paths)
  if (token.startsWith('.') || token.startsWith('/')) return false
  return true
}

function tokenize (command: string): ReadonlyArray<string> {
  const tokens: Array<string> = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let escaped = false

  for (const char of command) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle
      continue
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }

    if ((char === ' ' || char === '\t') && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

function extractPackagesFromTokens (
  tokens: ReadonlyArray<string>,
  startIndex: number
): ReadonlyArray<string> {
  const packages: Array<string> = []
  let i = startIndex

  while (i < tokens.length) {
    const token = tokens[i]
    if (token === undefined) break

    // Stop at shell operators
    if (token === '&&' || token === '||' || token === ';' || token === '|') break

    if (isFlag(token)) {
      // Some flags consume the next token as their value
      if (isFlagWithValue(token)) {
        i += 2
        continue
      }
      i += 1
      continue
    }

    if (isPackageName(token)) {
      // Strip version specifiers: lodash@4.17.21 -> lodash, lodash@^4 -> lodash
      const atIndex = token.startsWith('@') ? token.indexOf('@', 1) : token.indexOf('@')
      const name = atIndex > 0 ? token.slice(0, atIndex) : token
      packages.push(name)
    }

    i += 1
  }

  return packages
}

export function parseInstallCommand (command: string): Result<ParsedInstall | null, GatekeeperError> {
  const trimmed = command.trim()
  if (trimmed.length === 0) {
    return ok(null)
  }

  const tokens = tokenize(trimmed)
  if (tokens.length < 2) {
    return ok(null)
  }

  const manager = tokens[0]
  const subcommand = tokens[1]

  if (manager === undefined || subcommand === undefined) {
    return ok(null)
  }

  // Handle pip special case: "pip install" or "pip3 install" or "python -m pip install"
  const effectiveManager = (manager === 'pip' || manager === 'pip3')
    ? 'pip'
    : (manager === 'python' || manager === 'python3')
        ? 'pip'
        : manager

  // Handle "python -m pip install ..."
  if ((manager === 'python' || manager === 'python3') && subcommand === '-m') {
    const pipToken = tokens[2]
    const pipSubcommand = tokens[3]
    if (pipToken !== 'pip' || pipSubcommand === undefined) return ok(null)
    const installCommands = INSTALL_PATTERNS[effectiveManager]
    if (!installCommands || !installCommands.includes(pipSubcommand)) return ok(null)
    const packages = extractPackagesFromTokens(tokens, 4)
    if (packages.length === 0) return ok(null)
    return ok({ manager: 'pip', packages })
  }

  const installCommands = INSTALL_PATTERNS[effectiveManager]
  if (!installCommands) {
    return ok(null)
  }

  if (!installCommands.includes(subcommand)) {
    return ok(null)
  }

  const packages = extractPackagesFromTokens(tokens, 2)

  if (packages.length === 0) {
    return ok(null)
  }

  return ok({ manager: effectiveManager, packages })
}
