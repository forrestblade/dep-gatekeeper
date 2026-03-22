import { resolve } from 'node:path'
import { loadAllowlist, checkPackages } from './allowlist.js'
import { parseInstallCommand } from './parser.js'

const COMMANDS: Readonly<Record<string, (args: ReadonlyArray<string>) => Promise<void>>> = {
  check: async (args) => {
    const command = args.join(' ')
    if (command.length === 0) {
      console.error('Usage: dep-gatekeeper check <command>')
      process.exitCode = 1
      return
    }

    const parseResult = parseInstallCommand(command)
    if (parseResult.isErr()) {
      console.error(`Parse error: ${parseResult.error.message}`)
      process.exitCode = 1
      return
    }

    const parsed = parseResult.value
    if (parsed === null) {
      console.log('Not an install command — allowed')
      return
    }

    const configPath = resolve(process.cwd(), '.dep-allowlist.json')
    const configResult = await loadAllowlist(configPath)

    if (configResult.isErr()) {
      console.error(`Config error: ${configResult.error.message}`)
      process.exitCode = 1
      return
    }

    const results = checkPackages(configResult.value, parsed.packages)
    let blocked = false

    for (const result of results) {
      const status = result.allowed ? 'ALLOW' : 'DENY'
      console.log(`[${status}] ${result.package}: ${result.reason}`)
      if (!result.allowed) blocked = true
    }

    if (blocked) {
      process.exitCode = 2
    }
  }
}

export async function run (argv: ReadonlyArray<string>): Promise<void> {
  const command = argv[0]
  const commandArgs = argv.slice(1)

  if (!command) {
    console.error('Usage: dep-gatekeeper <check> [args...]')
    process.exitCode = 1
    return
  }

  const handler = COMMANDS[command]
  if (!handler) {
    console.error(`Unknown command: ${command}`)
    console.error('Available commands: check')
    process.exitCode = 1
    return
  }

  await handler(commandArgs)
}
