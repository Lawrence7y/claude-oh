import type {
  ExternalCliProvider,
  ProviderEditProposal,
} from './providerTypes.js'
import { isAbsolute, relative, resolve } from 'node:path'
import { resolveProviderInvocation } from './providerProfiles.js'
import { parseProviderStreamLine } from './providerParsers.js'
import {
  type CliProcessRunner,
  outputLines,
  runCliProcess,
} from './runner.js'

export type ExternalCliPromptOptions = {
  provider: ExternalCliProvider
  cwd: string
  prompt: string
  model?: string
  runProcess?: CliProcessRunner
}

export type ExternalCliPromptResult = {
  provider: ExternalCliProvider
  code: number | null
  text: string
  errors: string[]
  editProposals: ProviderEditProposal[]
}

function guardPrompt(prompt: string): string {
  return [
    'You are being used as an external agent provider inside claude-oh.',
    'Do not modify files directly. If code changes are needed, describe the proposed patch or emit structured edit proposals only.',
    '',
    prompt,
  ].join('\n')
}

function isPathInsideCwd(cwd: string, candidate: string): boolean {
  const resolved = isAbsolute(candidate)
    ? resolve(candidate)
    : resolve(cwd, candidate)
  const rel = relative(resolve(cwd), resolved)
  return rel === '' || (rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel))
}

function filterSafeEditProposals(
  cwd: string,
  proposals: ProviderEditProposal[],
  errors: string[],
): ProviderEditProposal[] {
  return proposals.filter(proposal => {
    if (isPathInsideCwd(cwd, proposal.filePath)) return true

    errors.push(
      `Rejected unsafe edit proposal path from ${proposal.provider}: ${proposal.filePath}`,
    )
    return false
  })
}

export async function runExternalCliPrompt(
  options: ExternalCliPromptOptions,
): Promise<ExternalCliPromptResult> {
  const invocation = resolveProviderInvocation(options.provider, {
    cwd: options.cwd,
    prompt: guardPrompt(options.prompt),
    model: options.model,
  })
  const result = await (options.runProcess ?? runCliProcess)(
    invocation.command,
    invocation.args,
    options.cwd,
  )

  const chunks: string[] = []
  const errors: string[] = []
  const editProposals: ProviderEditProposal[] = []

  for (const line of outputLines(result)) {
    const event = parseProviderStreamLine(options.provider, line)
    switch (event.kind) {
      case 'assistant.chunk':
        chunks.push(event.chunk)
        break
      case 'edit.proposals':
        editProposals.push(
          ...filterSafeEditProposals(options.cwd, event.proposals, errors),
        )
        break
      case 'error':
        errors.push(event.message)
        break
      default:
        break
    }
  }

  if (chunks.length === 0 && result.stdout.trim()) {
    chunks.push(result.stdout.trim())
  }
  if (result.code !== 0 && result.stderr.trim()) {
    errors.push(result.stderr.trim())
  }

  return {
    provider: options.provider,
    code: result.code,
    text: chunks.join('\n').trim(),
    errors,
    editProposals,
  }
}
