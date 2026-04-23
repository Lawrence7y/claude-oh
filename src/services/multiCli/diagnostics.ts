import { writeToStdout } from 'src/utils/process.js'
import {
  EXTERNAL_CLI_PROVIDERS,
  type ExternalCliProvider,
  type ProviderAvailability,
} from './providerTypes.js'
import { resolveExecutableName } from './providerProfiles.js'
import {
  type CliProcessRunner,
  outputLines,
  runCliProcess,
} from './runner.js'

export type ProviderCheck = {
  provider: ExternalCliProvider
  command: string
  args: string[]
}

export function getProviderChecks(): ProviderCheck[] {
  return EXTERNAL_CLI_PROVIDERS.map(provider => ({
    provider,
    command: resolveExecutableName(provider),
    args: ['--version'],
  }))
}

export async function checkProviderAvailability(
  check: ProviderCheck,
  options: {
    cwd: string
    runProcess?: CliProcessRunner
  },
): Promise<ProviderAvailability> {
  try {
    const result = await (options.runProcess ?? runCliProcess)(
      check.command,
      check.args,
      options.cwd,
    )
    return {
      provider: check.provider,
      executable: check.command,
      available: result.code === 0,
      detail: outputLines(result).join('\n').trim(),
    }
  } catch (error) {
    return {
      provider: check.provider,
      executable: check.command,
      available: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function checkAllProviderAvailability(options: {
  cwd: string
  runProcess?: CliProcessRunner
}): Promise<ProviderAvailability[]> {
  const results: ProviderAvailability[] = []
  for (const check of getProviderChecks()) {
    results.push(await checkProviderAvailability(check, options))
  }
  return results
}

export async function printProviderDiagnostics(cwd: string): Promise<void> {
  const statuses = await checkAllProviderAvailability({ cwd })
  for (const status of statuses) {
    const state = status.available ? 'available' : 'unavailable'
    const detail = status.detail ? ` (${status.detail})` : ''
    writeToStdout(`${status.provider}: ${state}${detail}\n`)
  }
}
