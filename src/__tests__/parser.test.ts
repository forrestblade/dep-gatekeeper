import { describe, it, expect } from 'vitest'
import { parseInstallCommand } from '../parser.js'

describe('parseInstallCommand', () => {
  describe('npm', () => {
    it('parses "npm install lodash"', () => {
      const result = parseInstallCommand('npm install lodash')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('npm')
      expect(parsed!.packages).toEqual(['lodash'])
    })

    it('parses "npm i express body-parser"', () => {
      const result = parseInstallCommand('npm i express body-parser')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('npm')
      expect(parsed!.packages).toEqual(['express', 'body-parser'])
    })

    it('parses "npm install -D typescript vitest"', () => {
      const result = parseInstallCommand('npm install -D typescript vitest')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.packages).toEqual(['typescript', 'vitest'])
    })

    it('parses "npm install --save-dev @types/node"', () => {
      const result = parseInstallCommand('npm install --save-dev @types/node')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.packages).toEqual(['@types/node'])
    })

    it('strips version specifiers: lodash@4.17.21', () => {
      const result = parseInstallCommand('npm install lodash@4.17.21')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['lodash'])
    })

    it('strips caret version specifiers: zod@^3.0.0', () => {
      const result = parseInstallCommand('npm install zod@^3.0.0')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['zod'])
    })

    it('handles scoped packages with versions: @valencets/core@1.0.0', () => {
      const result = parseInstallCommand('npm install @valencets/core@1.0.0')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['@valencets/core'])
    })
  })

  describe('pnpm', () => {
    it('parses "pnpm add zod"', () => {
      const result = parseInstallCommand('pnpm add zod')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('pnpm')
      expect(parsed!.packages).toEqual(['zod'])
    })

    it('parses "pnpm install typescript"', () => {
      const result = parseInstallCommand('pnpm install typescript')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.manager).toBe('pnpm')
      expect(parsed!.packages).toEqual(['typescript'])
    })

    it('parses "pnpm add -D vitest @vitest/coverage-v8"', () => {
      const result = parseInstallCommand('pnpm add -D vitest @vitest/coverage-v8')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['vitest', '@vitest/coverage-v8'])
    })
  })

  describe('yarn', () => {
    it('parses "yarn add react react-dom"', () => {
      const result = parseInstallCommand('yarn add react react-dom')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('yarn')
      expect(parsed!.packages).toEqual(['react', 'react-dom'])
    })
  })

  describe('pip', () => {
    it('parses "pip install requests"', () => {
      const result = parseInstallCommand('pip install requests')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('pip')
      expect(parsed!.packages).toEqual(['requests'])
    })

    it('parses "pip3 install flask django"', () => {
      const result = parseInstallCommand('pip3 install flask django')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.manager).toBe('pip')
      expect(parsed!.packages).toEqual(['flask', 'django'])
    })

    it('parses "python -m pip install numpy"', () => {
      const result = parseInstallCommand('python -m pip install numpy')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.manager).toBe('pip')
      expect(parsed!.packages).toEqual(['numpy'])
    })

    it('parses "python3 -m pip install pandas"', () => {
      const result = parseInstallCommand('python3 -m pip install pandas')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.manager).toBe('pip')
      expect(parsed!.packages).toEqual(['pandas'])
    })
  })

  describe('cargo', () => {
    it('parses "cargo add serde tokio"', () => {
      const result = parseInstallCommand('cargo add serde tokio')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed).not.toBeNull()
      expect(parsed!.manager).toBe('cargo')
      expect(parsed!.packages).toEqual(['serde', 'tokio'])
    })

    it('parses "cargo add --dev proptest"', () => {
      const result = parseInstallCommand('cargo add --dev proptest')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['proptest'])
    })
  })

  describe('non-install commands', () => {
    it('returns null for "npm run build"', () => {
      const result = parseInstallCommand('npm run build')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for "npm test"', () => {
      const result = parseInstallCommand('npm test')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for "git commit -m hello"', () => {
      const result = parseInstallCommand('git commit -m hello')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseInstallCommand('')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for "ls -la"', () => {
      const result = parseInstallCommand('ls -la')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for "npm install" with no packages (bare install)', () => {
      const result = parseInstallCommand('npm install')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })

    it('returns null for "pnpm install" with no packages (bare install)', () => {
      const result = parseInstallCommand('pnpm install')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles quoted package names', () => {
      const result = parseInstallCommand('npm install "lodash"')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['lodash'])
    })

    it('stops at shell operators: npm install foo && npm test', () => {
      const result = parseInstallCommand('npm install foo && npm test')
      expect(result.isOk()).toBe(true)
      const parsed = result.unwrap()
      expect(parsed!.packages).toEqual(['foo'])
    })

    it('ignores path-like arguments', () => {
      const result = parseInstallCommand('pip install ./local-package')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap()).toBeNull()
    })
  })
})
