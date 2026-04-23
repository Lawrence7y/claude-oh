import type { queryModelWithStreaming } from 'src/services/api/claude.js'
import { createAssistantAPIErrorMessage, createAssistantMessage } from 'src/utils/messages.js'
import { getCwd } from 'src/utils/cwd.js'
import { checkAllProviderAvailability } from './diagnostics.js'
import { runExternalCliPrompt } from './externalCliBackend.js'
import { parseProviderOptions } from './providerOptions.js'
import { runAutoAgentTask } from './taskAllocator.js'
import { isExternalCliProvider } from './providerTypes.js'
import type { ProviderEditProposal } from './providerTypes.js'

function blockText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null && 'text' in item) {
        const text = (item as { text?: unknown }).text
        return typeof text === 'string' ? text : ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function extractLastUserPrompt(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index] as
      | { type?: string; message?: { content?: unknown } }
      | undefined
    if (message?.type === 'user') {
      const text = blockText(message.message?.content)
      if (text.trim()) return text.trim()
    }
  }
  return ''
}

function formatEditProposalNotice(proposals: ProviderEditProposal[]): string {
  if (proposals.length === 0) return ''
  const lines = proposals.map(proposal =>
    proposal.type === 'write'
      ? `- ${proposal.provider} proposed writing ${proposal.filePath}`
      : `- ${proposal.provider} proposed replacing text in ${proposal.filePath}`,
  )
  return [
    '',
    'Edit proposals were captured but not applied automatically:',
    ...lines,
  ].join('\n')
}

function modelForProvider(
  provider: 'claude' | 'codex' | 'opencode',
  explicitModel: string | undefined,
  defaultModel: string | undefined,
): string | undefined {
  if (explicitModel) return explicitModel
  return provider === 'codex' ? undefined : defaultModel
}

export const queryExternalProviderWithStreaming: typeof queryModelWithStreaming =
  async function* ({ messages, options }) {
    const providerOptions = parseProviderOptions(
      process.argv.slice(2),
      process.env,
      process.env.CLAUDE_HAHA_COMMAND_NAME,
    )
    const prompt = extractLastUserPrompt(messages)
    const cwd = getCwd()

    if (!prompt) {
      yield createAssistantAPIErrorMessage({
        content: 'No prompt was found for the external CLI provider.',
      })
      return
    }

    try {
      if (providerOptions.provider === 'auto') {
        const availability = await checkAllProviderAvailability({ cwd })
        const result = await runAutoAgentTask({
          cwd,
          prompt,
          model: providerOptions.providerModel,
          allowedProviders: providerOptions.agentProviders,
          availability,
        })
        const proposals = result.results.flatMap(item => item.editProposals)
        yield createAssistantMessage({
          content:
            result.text +
            formatEditProposalNotice(proposals),
        })
        return
      }

      if (isExternalCliProvider(providerOptions.provider)) {
        const result = await runExternalCliPrompt({
          provider: providerOptions.provider,
          cwd,
          prompt,
          model: modelForProvider(
            providerOptions.provider,
            providerOptions.providerModel,
            options.model,
          ),
        })
        yield createAssistantMessage({
          content:
            (result.text || result.errors.join('\n') || 'No output.') +
            formatEditProposalNotice(result.editProposals),
        })
      }
    } catch (error) {
      yield createAssistantAPIErrorMessage({
        content: error instanceof Error ? error.message : String(error),
      })
    }
  }
