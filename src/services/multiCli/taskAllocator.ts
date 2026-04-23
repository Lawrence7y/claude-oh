import type {
  AgentRole,
  ExternalCliProvider,
  ProviderAvailability,
} from './providerTypes.js'
import { runExternalCliPrompt } from './externalCliBackend.js'
import type {
  ExternalCliPromptOptions,
  ExternalCliPromptResult,
} from './externalCliBackend.js'

export type AgentTaskStage = {
  role: AgentRole
  provider: ExternalCliProvider
  prompt: string
}

export type AgentTaskPlan = {
  stages: AgentTaskStage[]
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase()
}

function pickProvider(
  preferred: ExternalCliProvider[],
  available: Set<ExternalCliProvider>,
  allowed: Set<ExternalCliProvider>,
): ExternalCliProvider | undefined {
  return preferred.find(provider => available.has(provider) && allowed.has(provider))
}

function explicitProviderForPrompt(
  prompt: string,
  available: Set<ExternalCliProvider>,
  allowed: Set<ExternalCliProvider>,
): ExternalCliProvider | undefined {
  const normalized = normalizePrompt(prompt)
  const candidates: Array<[ExternalCliProvider, RegExp]> = [
    ['opencode', /\b(?:open\s*code|open-code|opencode)\b/],
    ['codex', /\bcodex\b/],
    ['claude', /\bclaude\b/],
  ]

  for (const [provider, pattern] of candidates) {
    if (pattern.test(normalized) && available.has(provider) && allowed.has(provider)) {
      return provider
    }
  }
  return undefined
}

function stripProviderDirective(
  prompt: string,
  provider: ExternalCliProvider,
): string {
  const providerPattern =
    provider === 'opencode'
      ? '(?:open\\s*code|open-code|opencode)'
      : provider
  const directive = new RegExp(
    `^\\s*(?:(?:please\\s+)?(?:use|call)|\\u8c03\\u7528)\\s+${providerPattern}\\s*(?:cli)?\\s*`,
    'i',
  )
  return prompt.replace(directive, '').trim() || prompt
}

function isLightweightQuestion(prompt: string): boolean {
  const normalized = normalizePrompt(prompt)
  if (normalized.length > 160) return false
  if (/[\n\r]/.test(prompt)) return false

  return (
    normalized.includes('\u80fd\u8c03\u7528') ||
    normalized.includes('\u53ef\u4ee5\u8c03\u7528') ||
    normalized.includes('\u80fd\u4e0d\u80fd\u8c03\u7528') ||
    normalized.includes('can you') ||
    normalized.includes('are you able') ||
    normalized.includes('what can you do')
  )
}

export function allocateAgentTasks(options: {
  prompt: string
  availableProviders: ExternalCliProvider[]
  allowedProviders: ExternalCliProvider[]
}): AgentTaskPlan {
  const available = new Set(options.availableProviders)
  const allowed = new Set(options.allowedProviders)

  if (isLightweightQuestion(options.prompt)) {
    const provider =
      pickProvider(['claude', 'opencode', 'codex'], available, allowed) ??
      options.availableProviders[0]
    return {
      stages: provider
        ? [
            {
              role: 'planner',
              provider,
              prompt: options.prompt,
            },
          ]
        : [],
    }
  }

  const explicitProvider = explicitProviderForPrompt(
    options.prompt,
    available,
    allowed,
  )

  if (explicitProvider) {
    return {
      stages: [
        {
          role: 'coder',
          provider: explicitProvider,
          prompt: [
            'Use the explicitly requested external CLI provider for this task.',
            'Use sensible defaults when details are missing.',
            '',
            stripProviderDirective(options.prompt, explicitProvider),
          ].join('\n'),
        },
      ],
    }
  }

  const planner =
    pickProvider(['claude', 'opencode', 'codex'], available, allowed) ??
    options.availableProviders[0]
  const coder =
    pickProvider(['codex', 'claude', 'opencode'], available, allowed) ??
    planner
  const reviewer =
    pickProvider(['claude', 'opencode', 'codex'], available, allowed) ??
    coder

  const stages: AgentTaskStage[] = []
  if (planner) {
    stages.push({
      role: 'planner',
      provider: planner,
      prompt: [
        'Plan the task. Return concise implementation steps.',
        'Do not modify files directly.',
        '',
        options.prompt,
      ].join('\n'),
    })
  }
  if (coder) {
    stages.push({
      role: 'coder',
      provider: coder,
      prompt: [
        'Implement the task conceptually. Return proposed edits or commands.',
        'Do not modify files directly.',
        '',
        options.prompt,
      ].join('\n'),
    })
  }
  if (reviewer) {
    stages.push({
      role: 'reviewer',
      provider: reviewer,
      prompt: [
        'Review the proposed result. Return findings first, then a brief summary.',
        'Do not modify files directly.',
        '',
        options.prompt,
      ].join('\n'),
    })
  }

  return { stages }
}

export async function runAutoAgentTask(options: {
  cwd: string
  prompt: string
  model?: string
  allowedProviders: ExternalCliProvider[]
  availability: ProviderAvailability[]
  runProvider?: (
    options: ExternalCliPromptOptions,
  ) => Promise<ExternalCliPromptResult>
}): Promise<{
  text: string
  results: ExternalCliPromptResult[]
}> {
  const availableProviders = options.availability
    .filter(status => status.available)
    .map(status => status.provider)
  const plan = allocateAgentTasks({
    prompt: options.prompt,
    availableProviders,
    allowedProviders: options.allowedProviders,
  })

  if (plan.stages.length === 0) {
    return {
      text: 'No external CLI providers are available.',
      results: [],
    }
  }

  const runProvider = options.runProvider ?? runExternalCliPrompt
  const results: ExternalCliPromptResult[] = []
  const sections: string[] = []
  const useSections = plan.stages.length > 1

  for (const stage of plan.stages) {
    const result = await runProvider({
      provider: stage.provider,
      cwd: options.cwd,
      prompt: stage.prompt,
      model: stage.provider === 'codex' ? undefined : options.model,
    })
    results.push(result)
    const text = result.text || result.errors.join('\n') || 'No output.'
    sections.push(
      useSections
        ? [`## ${stage.role} (${stage.provider})`, text].join('\n')
        : text,
    )
  }

  return {
    text: sections.join('\n\n'),
    results,
  }
}
