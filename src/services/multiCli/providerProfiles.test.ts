import { describe, expect, it } from 'bun:test'
import { resolveProviderInvocation } from './providerProfiles.js'

describe('multi CLI provider profiles', () => {
  it('builds a Codex JSON exec invocation', () => {
    expect(
      resolveProviderInvocation('codex', {
        cwd: 'D:/repo',
        prompt: 'fix tests',
        model: 'gpt-5.4',
      }),
    ).toMatchObject({
      args: ['exec', '--json', '-C', 'D:/repo', '-m', 'gpt-5.4', 'fix tests'],
    })
  })

  it('builds a Claude stream-json invocation', () => {
    expect(
      resolveProviderInvocation('claude', {
        cwd: 'D:/repo',
        prompt: 'plan',
      }).args,
    ).toEqual(['-p', '--verbose', '--output-format', 'stream-json', 'plan'])
  })

  it('builds an OpenCode JSON invocation', () => {
    expect(
      resolveProviderInvocation('opencode', {
        cwd: 'D:/repo',
        prompt: 'review',
        model: 'minimax/MiniMax-M2.7',
      }).args,
    ).toEqual([
      'run',
      '--format',
      'json',
      '--dir',
      'D:/repo',
      '--model',
      'minimax/MiniMax-M2.7',
      'review',
    ])
  })
})
