import type { LocalCommandResult } from '../../types/command.js'
import { checkAllProviderAvailability } from '../../services/multiCli/diagnostics.js'
import { getCwd } from '../../utils/cwd.js'

export async function call(): Promise<LocalCommandResult> {
  const statuses = await checkAllProviderAvailability({ cwd: getCwd() })
  return {
    type: 'text',
    value: statuses
      .map(status => {
        const state = status.available ? 'available' : 'unavailable'
        const detail = status.detail ? ` (${status.detail})` : ''
        return `${status.provider}: ${state}${detail}`
      })
      .join('\n'),
  }
}
