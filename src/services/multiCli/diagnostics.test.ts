import { describe, expect, it } from 'bun:test'
import { checkProviderAvailability } from './diagnostics.js'

describe('multi CLI diagnostics', () => {
  it('marks a provider available when version command exits cleanly', async () => {
    const status = await checkProviderAvailability(
      { provider: 'claude', command: 'claude', args: ['--version'] },
      {
        cwd: 'D:/repo',
        runProcess: async () => ({
          code: 0,
          stdout: 'Claude Code 1.0.0\n',
          stderr: '',
        }),
      },
    )

    expect(status.available).toBe(true)
    expect(status.detail).toContain('Claude Code')
  })

  it('marks a provider unavailable when spawn fails', async () => {
    const status = await checkProviderAvailability(
      { provider: 'codex', command: 'codex', args: ['--version'] },
      {
        cwd: 'D:/repo',
        runProcess: async () => {
          throw new Error('missing executable')
        },
      },
    )

    expect(status.available).toBe(false)
    expect(status.detail).toContain('missing executable')
  })
})
