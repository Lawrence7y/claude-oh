export const EXTERNAL_CLI_PROVIDERS = ['claude', 'codex', 'opencode'] as const
export const PROVIDERS = [
  'anthropic',
  ...EXTERNAL_CLI_PROVIDERS,
  'auto',
] as const

export type ExternalCliProvider = (typeof EXTERNAL_CLI_PROVIDERS)[number]
export type ProviderId = (typeof PROVIDERS)[number]
export type AgentRole = 'planner' | 'coder' | 'reviewer'

export type ProviderEditProposal =
  | {
      provider: ExternalCliProvider
      source: string
      type: 'write'
      filePath: string
      content: string
    }
  | {
      provider: ExternalCliProvider
      source: string
      type: 'replace'
      filePath: string
      oldString: string
      newString: string
    }

export type ProviderStreamEvent =
  | { kind: 'assistant.chunk'; chunk: string }
  | { kind: 'edit.proposals'; proposals: ProviderEditProposal[] }
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'ignore' }

export type ProviderAvailability = {
  provider: ExternalCliProvider
  executable: string
  available: boolean
  detail: string
}

export function isExternalCliProvider(
  value: string | undefined,
): value is ExternalCliProvider {
  return (
    value === 'claude' || value === 'codex' || value === 'opencode'
  )
}

export function isProviderId(value: string | undefined): value is ProviderId {
  return (
    value === 'anthropic' ||
    value === 'auto' ||
    isExternalCliProvider(value)
  )
}
