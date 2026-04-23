import { describe, expect, it } from 'bun:test'
import { allocateAgentTasks, runAutoAgentTask } from './taskAllocator.js'

describe('multi CLI task allocator', () => {
  it('creates planner coder and reviewer stages for auto mode', () => {
    const plan = allocateAgentTasks({
      prompt: 'modify code and run tests',
      availableProviders: ['claude', 'codex', 'opencode'],
      allowedProviders: ['claude', 'codex', 'opencode'],
    })

    expect(plan.stages.map(stage => [stage.role, stage.provider])).toEqual([
      ['planner', 'claude'],
      ['coder', 'codex'],
      ['reviewer', 'claude'],
    ])
  })

  it('falls coder back when Codex is unavailable', () => {
    const plan = allocateAgentTasks({
      prompt: 'fix code',
      availableProviders: ['claude', 'opencode'],
      allowedProviders: ['claude', 'codex', 'opencode'],
    })

    expect(plan.stages.find(stage => stage.role === 'coder')?.provider).toBe(
      'claude',
    )
  })

  it('uses one provider for lightweight capability questions', () => {
    const plan = allocateAgentTasks({
      prompt: 'can you call codex cli',
      availableProviders: ['claude', 'codex', 'opencode'],
      allowedProviders: ['claude', 'codex', 'opencode'],
    })

    expect(plan.stages.map(stage => [stage.role, stage.provider])).toEqual([
      ['planner', 'claude'],
    ])
  })

  it('routes explicit OpenCode requests only to OpenCode', () => {
    const plan = allocateAgentTasks({
      prompt: 'call open code cli to make a personal website',
      availableProviders: ['claude', 'codex', 'opencode'],
      allowedProviders: ['claude', 'codex', 'opencode'],
    })

    expect(plan.stages.map(stage => [stage.role, stage.provider])).toEqual([
      ['coder', 'opencode'],
    ])
    expect(plan.stages[0]?.prompt).not.toContain('call open code cli')
  })

  it('does not pass the auto mode model into Codex stages', async () => {
    const seen: Array<{ provider: string; model?: string }> = []
    await runAutoAgentTask({
      cwd: 'D:/repo',
      prompt: 'modify code and run tests',
      model: 'MiniMax-M2.7',
      allowedProviders: ['claude', 'codex', 'opencode'],
      availability: [
        {
          provider: 'claude',
          executable: 'claude',
          available: true,
          detail: '',
        },
        {
          provider: 'codex',
          executable: 'codex',
          available: true,
          detail: '',
        },
      ],
      runProvider: async options => {
        seen.push({ provider: options.provider, model: options.model })
        return {
          provider: options.provider,
          code: 0,
          text: 'ok',
          errors: [],
          editProposals: [],
        }
      },
    })

    expect(seen).toContainEqual({ provider: 'codex', model: undefined })
  })
})
