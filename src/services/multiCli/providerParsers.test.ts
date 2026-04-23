import { describe, expect, it } from 'bun:test'
import { parseProviderStreamLine } from './providerParsers.js'

describe('multi CLI stream parsers', () => {
  it('parses Codex assistant chunks', () => {
    expect(
      parseProviderStreamLine(
        'codex',
        '{"type":"item.completed","item":{"type":"agent_message","text":"done"}}',
      ),
    ).toEqual({ kind: 'assistant.chunk', chunk: 'done' })
  })

  it('parses Claude stream-json text', () => {
    expect(
      parseProviderStreamLine(
        'claude',
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'hello' }] },
        }),
      ),
    ).toEqual({ kind: 'assistant.chunk', chunk: 'hello' })
  })

  it('parses OpenCode text and strips think blocks', () => {
    expect(
      parseProviderStreamLine(
        'opencode',
        '{"type":"text","part":{"type":"text","text":"<think>x</think>\\nhi"}}',
      ),
    ).toEqual({ kind: 'assistant.chunk', chunk: 'hi' })
  })

  it('captures structured edit proposals without applying them', () => {
    expect(
      parseProviderStreamLine(
        'codex',
        JSON.stringify({
          type: 'item.completed',
          item: {
            type: 'function_call',
            name: 'edit_file',
            arguments: JSON.stringify({
              path: 'README.md',
              old_string: 'old',
              new_string: 'new',
            }),
          },
        }),
      ),
    ).toEqual({
      kind: 'edit.proposals',
      proposals: [
        {
          provider: 'codex',
          source: 'codex.function_call.edit_file',
          type: 'replace',
          filePath: 'README.md',
          oldString: 'old',
          newString: 'new',
        },
      ],
    })
  })

  it('ignores unknown schemas', () => {
    expect(parseProviderStreamLine('opencode', '{"type":"unknown"}')).toEqual({
      kind: 'ignore',
    })
  })
})
