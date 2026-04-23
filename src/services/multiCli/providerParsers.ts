import type {
  ExternalCliProvider,
  ProviderEditProposal,
  ProviderStreamEvent,
} from './providerTypes.js'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function safeJson(line: string): unknown {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

function sanitizeChunk(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

function parseMaybeJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') return asRecord(safeJson(value))
  return asRecord(value)
}

function readToolInput(record: Record<string, unknown>) {
  return (
    parseMaybeJsonRecord(record.input) ??
    parseMaybeJsonRecord(record.arguments) ??
    parseMaybeJsonRecord(record.params)
  )
}

function normalizeToolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function proposalFromToolInput(
  provider: ExternalCliProvider,
  source: string,
  toolName: string,
  input: Record<string, unknown> | null,
): ProviderEditProposal[] {
  if (!input) return []

  const filePath = firstString(input, [
    'file_path',
    'filePath',
    'filepath',
    'path',
  ])
  if (!filePath) return []

  const normalizedName = normalizeToolName(toolName)
  const content = firstString(input, [
    'content',
    'text',
    'new_content',
    'newContent',
  ])
  if (
    content !== undefined &&
    [
      'write',
      'write_file',
      'writefile',
      'create',
      'create_file',
      'createfile',
    ].includes(normalizedName)
  ) {
    return [{ provider, source, type: 'write', filePath, content }]
  }

  const oldString = firstString(input, [
    'old_string',
    'oldString',
    'old',
    'search',
    'find',
  ])
  const newString = firstString(input, [
    'new_string',
    'newString',
    'replacement',
    'replace',
    'new',
  ])
  if (
    oldString !== undefined &&
    newString !== undefined &&
    [
      'edit',
      'edit_file',
      'editfile',
      'replace',
      'replace_file',
      'replace_in_file',
    ].includes(normalizedName)
  ) {
    return [
      {
        provider,
        source,
        type: 'replace',
        filePath,
        oldString,
        newString,
      },
    ]
  }

  return []
}

function parseErrorEvent(
  record: Record<string, unknown>,
): ProviderStreamEvent | undefined {
  if (record.type === 'error' && typeof record.message === 'string') {
    return { kind: 'error', message: record.message }
  }

  if (typeof record.type === 'string' && record.type.endsWith('.failed')) {
    const error = asRecord(record.error)
    if (typeof error?.message === 'string') {
      return { kind: 'error', message: error.message }
    }
  }

  return undefined
}

function parseCodexEditProposals(
  item: Record<string, unknown> | null,
): ProviderEditProposal[] {
  if (!item || typeof item.name !== 'string' || typeof item.type !== 'string') {
    return []
  }
  if (!['tool_call', 'function_call'].includes(item.type)) return []

  return proposalFromToolInput(
    'codex',
    `codex.${item.type}.${item.name}`,
    item.name,
    readToolInput(item),
  )
}

function parseCodexStreamLine(line: string): ProviderStreamEvent {
  const record = asRecord(safeJson(line))
  if (!record) return { kind: 'ignore' }

  const error = parseErrorEvent(record)
  if (error) return error

  if (record.type === 'item.completed') {
    const item = asRecord(record.item)
    const proposals = parseCodexEditProposals(item)
    if (proposals.length > 0) return { kind: 'edit.proposals', proposals }
    if (
      item?.type === 'agent_message' &&
      typeof item.text === 'string' &&
      item.text.length > 0
    ) {
      return { kind: 'assistant.chunk', chunk: item.text }
    }
  }

  if (record.type === 'turn.completed') return { kind: 'done' }
  return { kind: 'ignore' }
}

function parseOpenCodeEditProposals(
  record: Record<string, unknown>,
): ProviderEditProposal[] {
  if (
    record.type !== 'tool' &&
    record.type !== 'tool_finish' &&
    record.type !== 'tool_result'
  ) {
    return []
  }

  const part = asRecord(record.part) ?? record
  const toolName = firstString(part, ['tool', 'name'])
  if (!toolName) return []

  const state = asRecord(part.state)
  const input = readToolInput(part) ?? (state ? readToolInput(state) : null)
  return proposalFromToolInput(
    'opencode',
    `opencode.tool.${toolName}`,
    toolName,
    input,
  )
}

function parseOpenCodeStreamLine(line: string): ProviderStreamEvent {
  const record = asRecord(safeJson(line))
  if (!record) return { kind: 'ignore' }

  const error = parseErrorEvent(record)
  if (error) return error

  if (record.type === 'text') {
    const part = asRecord(record.part)
    if (typeof part?.text === 'string') {
      const chunk = sanitizeChunk(part.text)
      return chunk ? { kind: 'assistant.chunk', chunk } : { kind: 'ignore' }
    }
  }

  const proposals = parseOpenCodeEditProposals(record)
  if (proposals.length > 0) return { kind: 'edit.proposals', proposals }

  if (record.type === 'step_finish') return { kind: 'done' }
  return { kind: 'ignore' }
}

function parseClaudeEditProposals(
  entries: Record<string, unknown>[],
): ProviderEditProposal[] {
  return entries.flatMap((entry): ProviderEditProposal[] => {
    if (entry.type !== 'tool_use' || typeof entry.name !== 'string') return []
    const input = asRecord(entry.input)
    if (!input || typeof input.file_path !== 'string') return []

    if (entry.name === 'Write' && typeof input.content === 'string') {
      return [
        {
          provider: 'claude',
          source: 'claude.tool_use.Write',
          type: 'write',
          filePath: input.file_path,
          content: input.content,
        },
      ]
    }

    if (
      entry.name === 'Edit' &&
      typeof input.old_string === 'string' &&
      typeof input.new_string === 'string'
    ) {
      return [
        {
          provider: 'claude',
          source: 'claude.tool_use.Edit',
          type: 'replace',
          filePath: input.file_path,
          oldString: input.old_string,
          newString: input.new_string,
        },
      ]
    }

    return []
  })
}

function parseClaudeStreamLine(line: string): ProviderStreamEvent {
  const record = asRecord(safeJson(line))
  if (!record) return { kind: 'ignore' }

  const error = parseErrorEvent(record)
  if (error) return error

  if (record.type === 'assistant') {
    const message = asRecord(record.message)
    const content = Array.isArray(message?.content) ? message.content : []
    const entries = content
      .map(entry => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))

    const proposals = parseClaudeEditProposals(entries)
    if (proposals.length > 0) return { kind: 'edit.proposals', proposals }

    const chunk = entries
      .filter(entry => entry.type === 'text' && typeof entry.text === 'string')
      .map(entry => String(entry.text))
      .join('\n')
    if (chunk.length > 0) return { kind: 'assistant.chunk', chunk }
  }

  if (record.type === 'result') return { kind: 'done' }
  return { kind: 'ignore' }
}

export function parseProviderStreamLine(
  provider: ExternalCliProvider,
  line: string,
): ProviderStreamEvent {
  switch (provider) {
    case 'claude':
      return parseClaudeStreamLine(line)
    case 'opencode':
      return parseOpenCodeStreamLine(line)
    case 'codex':
    default:
      return parseCodexStreamLine(line)
  }
}
