import { describe, expect, it } from 'bun:test'
import { runExternalCliPrompt } from './externalCliBackend.js'

describe('external CLI backend', () => {
  it('invokes the selected provider through the process runner', async () => {
    const calls: Array<{ command: string; args: string[]; cwd: string }> = []
    const result = await runExternalCliPrompt({
      provider: 'codex',
      cwd: 'D:/repo',
      prompt: 'fix tests',
      runProcess: async (command, args, cwd) => {
        calls.push({ command, args, cwd })
        return {
          code: 0,
          stdout:
            '{"type":"item.completed","item":{"type":"agent_message","text":"done"}}',
          stderr: '',
        }
      },
    })

    expect(calls[0]?.cwd).toBe('D:/repo')
    expect(calls[0]?.args.slice(0, 4)).toEqual([
      'exec',
      '--json',
      '-C',
      'D:/repo',
    ])
    expect(result.text).toBe('done')
  })

  it('rejects edit proposals outside the workspace', async () => {
    const result = await runExternalCliPrompt({
      provider: 'codex',
      cwd: 'D:/repo',
      prompt: 'edit outside',
      runProcess: async () => ({
        code: 0,
        stdout: JSON.stringify({
          type: 'item.completed',
          item: {
            type: 'function_call',
            name: 'edit_file',
            arguments: JSON.stringify({
              path: '../outside.txt',
              old_string: 'old',
              new_string: 'new',
            }),
          },
        }),
        stderr: '',
      }),
    })

    expect(result.editProposals).toEqual([])
    expect(result.errors.join('\n')).toContain(
      'Rejected unsafe edit proposal path',
    )
  })
})
