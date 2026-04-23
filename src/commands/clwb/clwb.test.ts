import { describe, expect, it } from 'bun:test'
import { buildStagePrompt } from './clwb.js'

describe('/clwb stage prompt', () => {
  it('passes previous stage output into later stages', () => {
    const prompt = buildStagePrompt({
      promptSuffix: 'Review the implementation.',
      userPrompt: 'Fix startup.',
      previousOutput: 'Coder output: changed src/main.tsx',
    })

    expect(prompt).toContain('Review the implementation.')
    expect(prompt).toContain('Fix startup.')
    expect(prompt).toContain('Coder output: changed src/main.tsx')
  })
})

