import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ExternalCliProvider } from './providerTypes.js'

export type ProviderInvocationOptions = {
  cwd: string
  prompt: string
  model?: string
}

export type ProviderInvocation = {
  command: string
  args: string[]
}

export function resolveExecutableName(command: string): string {
  if (process.platform !== 'win32') return command

  const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  const shimPath = join(appData, 'npm', `${command}.cmd`)
  return existsSync(shimPath) ? shimPath : `${command}.cmd`
}

export function resolveProviderInvocation(
  provider: ExternalCliProvider,
  options: ProviderInvocationOptions,
): ProviderInvocation {
  switch (provider) {
    case 'claude': {
      const args = ['-p', '--verbose', '--output-format', 'stream-json']
      if (options.model) args.push('--model', options.model)
      args.push(options.prompt)
      return { command: resolveExecutableName('claude'), args }
    }
    case 'opencode': {
      const args = ['run', '--format', 'json', '--dir', options.cwd]
      if (options.model) args.push('--model', options.model)
      args.push(options.prompt)
      return { command: resolveExecutableName('opencode'), args }
    }
    case 'codex':
    default: {
      const args = ['exec', '--json', '-C', options.cwd]
      if (options.model) args.push('-m', options.model)
      args.push(options.prompt)
      return { command: resolveExecutableName('codex'), args }
    }
  }
}
