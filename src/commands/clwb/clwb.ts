import type { LocalCommandCall } from '../../types/command.js'
import type { ExternalCliProvider } from '../../services/multiCli/providerTypes.js'
import { runExternalCliPrompt } from '../../services/multiCli/externalCliBackend.js'
import type { ExternalCliPromptResult } from '../../services/multiCli/externalCliBackend.js'
import { checkAllProviderAvailability } from '../../services/multiCli/diagnostics.js'
import { getCwd } from '../../utils/cwd.js'
import { parseProviderOptions } from '../../services/multiCli/providerOptions.js'

const PIPELINE_NAMES = ['single', 'code-review', 'review-code', 'dual-review'] as const
type PipelineName = (typeof PIPELINE_NAMES)[number]

const PIPELINE_DESCRIPTIONS: Record<PipelineName, string> = {
  single: 'No pipeline. Use default provider only.',
  'code-review': 'Coder generates \u2192 Reviewer reviews. Weak model writes, strong model reviews.',
  'review-code': 'Reviewer designs \u2192 Coder implements. Strong model plans, fast model codes.',
  'dual-review': 'Coder generates \u2192 Reviewer reviews \u2192 Final assessment. Full pipeline.',
}

type StageRole = 'planner' | 'coder' | 'reviewer'
type StageDef = { role: StageRole; providerPreference: ExternalCliProvider[]; promptSuffix: string }

export function buildStagePrompt({
  promptSuffix,
  userPrompt,
  previousOutput,
}: {
  promptSuffix: string
  userPrompt: string
  previousOutput?: string
}): string {
  const sections = [promptSuffix]
  const trimmedPreviousOutput = previousOutput?.trim()

  if (trimmedPreviousOutput) {
    sections.push('Previous stage output:', trimmedPreviousOutput)
  }

  sections.push('User task:', userPrompt)
  return sections.join('\n\n')
}

const PIPELINE_STAGES: Record<Exclude<PipelineName, 'single'>, StageDef[]> = {
  'code-review': [
    { role: 'coder', providerPreference: ['codex', 'opencode', 'claude'], promptSuffix: 'Implement the task. Return proposed edits or code changes. Do not modify files directly.' },
    { role: 'reviewer', providerPreference: ['claude', 'opencode', 'codex'], promptSuffix: 'Review the proposed implementation critically. Identify bugs, edge cases, and improvements. Do not modify files directly.' },
  ],
  'review-code': [
    { role: 'planner', providerPreference: ['claude', 'opencode', 'codex'], promptSuffix: 'Design the task thoroughly. Return concise implementation steps and architecture decisions. Do not modify files directly.' },
    { role: 'coder', providerPreference: ['codex', 'opencode', 'claude'], promptSuffix: 'Implement the task based on the plan above. Return proposed edits or code changes. Do not modify files directly.' },
  ],
  'dual-review': [
    { role: 'coder', providerPreference: ['codex', 'opencode', 'claude'], promptSuffix: 'Implement the task. Return proposed edits or code changes. Do not modify files directly.' },
    { role: 'reviewer', providerPreference: ['claude', 'opencode', 'codex'], promptSuffix: 'Review the proposed implementation critically. Identify bugs, edge cases, and improvements. Do not modify files directly.' },
    { role: 'reviewer', providerPreference: ['claude', 'opencode', 'codex'], promptSuffix: 'Provide a final assessment summarizing the quality, correctness, and any remaining concerns. Do not modify files directly.' },
  ],
}

function pickProvider(
  preferred: ExternalCliProvider[],
  available: Set<ExternalCliProvider>,
  allowed: Set<ExternalCliProvider>,
): ExternalCliProvider | undefined {
  return preferred.find(p => available.has(p) && allowed.has(p))
}

async function runPipelineStages(
  stages: StageDef[],
  prompt: string,
  availableProviders: ExternalCliProvider[],
  allowedProviders: ExternalCliProvider[],
  cwd: string,
  model?: string,
): Promise<{ sections: string[]; results: ExternalCliPromptResult[] }> {
  const available = new Set(availableProviders)
  const allowed = new Set(allowedProviders)
  const results: ExternalCliPromptResult[] = []
  const sections: string[] = []
  let previousOutput = ''

  for (const stageDef of stages) {
    const provider = pickProvider(stageDef.providerPreference, available, allowed)
    if (!provider) {
      sections.push(`## ${stageDef.role} (unavailable)\n\nNo suitable provider available for ${stageDef.role} stage.`)
      continue
    }

    const fullPrompt = buildStagePrompt({
      promptSuffix: stageDef.promptSuffix,
      userPrompt: prompt,
      previousOutput,
    })
    const result = await runExternalCliPrompt({
      provider,
      cwd,
      prompt: fullPrompt,
      model: provider === 'codex' ? undefined : model,
    })
    results.push(result)

    const text = result.text || result.errors.join('\n') || 'No output.'
    previousOutput = text
    sections.push(`## ${stageDef.role} (${provider})\n\n${text}`)
  }

  return { sections, results }
}

export const call: LocalCommandCall = async (args, _context) => {
  const parts = args.trim().split(/\s+/)
  const subcommand = parts[0]?.toLowerCase()

  if (!subcommand || subcommand === 'list' || subcommand === 'ls') {
    const lines = ['Available pipelines:', '']
    for (const name of PIPELINE_NAMES) {
      lines.push(`  ${name}: ${PIPELINE_DESCRIPTIONS[name]}`)
    }
    return { type: 'text', value: lines.join('\n') }
  }

  const providerOptions = parseProviderOptions(
    process.argv.slice(2),
    process.env,
    process.env.CLAUDE_HAHA_COMMAND_NAME,
  )

  if (subcommand === 'status') {
    const availability = await checkAllProviderAvailability({ cwd: getCwd() })
    const lines = [
      `Current provider: ${providerOptions.provider}`,
      `Agent providers: ${providerOptions.agentProviders.join(', ')}`,
      '',
      'Provider availability:',
      ...availability.map(s => `  ${s.provider}: ${s.available ? 'available' : 'unavailable'}${s.detail ? ` (${s.detail})` : ''}`),
    ]
    return { type: 'text', value: lines.join('\n') }
  }

  if (subcommand === 'single') {
    return { type: 'text', value: 'Pipeline disabled. Use /model to select a single provider.' }
  }

  const validPipelines: PipelineName[] = ['code-review', 'review-code', 'dual-review']
  const pipelineName = validPipelines.includes(subcommand as PipelineName)
    ? (subcommand as PipelineName)
    : subcommand === 'run'
      ? 'code-review'
      : null

  if (!pipelineName) {
    return {
      type: 'text',
      value: `Unknown pipeline: ${subcommand}\nAvailable: ${PIPELINE_NAMES.slice(1).join(', ')}\nUsage: /clwb <${PIPELINE_NAMES.slice(1).join(' | ')}>`,
    }
  }

  const prompt = parts.slice(1).join(' ').trim()

  if (!prompt) {
    return {
      type: 'text',
      value: `Usage: /clwb ${pipelineName} <prompt>\nYou must provide a prompt for the pipeline.`,
    }
  }

  const cwd = getCwd()
  const availability = await checkAllProviderAvailability({ cwd })
  const availableProviders = availability.filter(s => s.available).map(s => s.provider)

  if (availableProviders.length === 0) {
    return { type: 'text', value: 'No external CLI providers are available. Install codex, claude, or opencode.' }
  }

  const allowedProviders = providerOptions.agentProviders.filter(p => availableProviders.includes(p))

  if (allowedProviders.length === 0) {
    return {
      type: 'text',
      value: `None of the allowed providers (${providerOptions.agentProviders.join(', ')}) are available.\nAvailable: ${availableProviders.join(', ')}`,
    }
  }

  const stageDefs = PIPELINE_STAGES[pipelineName]

  try {
    const { sections } = await runPipelineStages(
      stageDefs,
      prompt,
      availableProviders,
      allowedProviders,
      cwd,
      providerOptions.providerModel,
    )

    return { type: 'text', value: sections.join('\n\n---\n\n') }
  } catch (error) {
    return {
      type: 'text',
      value: `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
