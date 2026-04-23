import { describe, expect, it } from 'bun:test'
import {
  parseAgentProviderList,
  parseProviderOptions,
} from './providerOptions.js'

describe('multi CLI provider options', () => {
  it('keeps the legacy Anthropic backend unless a provider is configured', () => {
    expect(parseProviderOptions([], {}, 'claude-haha')).toEqual({
      provider: 'anthropic',
      providerModel: undefined,
      agentProviders: ['claude', 'codex', 'opencode'],
      commandName: 'claude-haha',
    })
  })

  it('defaults claude-oh to auto provider mode', () => {
    expect(parseProviderOptions([], {}, 'claude-oh').provider).toBe('auto')
  })

  it('parses CLI flags ahead of environment variables', () => {
    expect(
      parseProviderOptions(
        ['--provider', 'codex', '--provider-model', 'gpt-test'],
        {
          CLAUDE_HAHA_PROVIDER: 'opencode',
          CLAUDE_HAHA_PROVIDER_MODEL: 'ignored',
        },
        'claude-haha',
      ),
    ).toMatchObject({
      provider: 'codex',
      providerModel: 'gpt-test',
    })
  })

  it('parses a stable provider allowlist', () => {
    expect(parseAgentProviderList('codex, claude,missing,opencode')).toEqual([
      'codex',
      'claude',
      'opencode',
    ])
  })
})
