import {
  EXTERNAL_CLI_PROVIDERS,
  type ExternalCliProvider,
  type ProviderId,
  isExternalCliProvider,
  isProviderId,
} from './providerTypes.js'

export type MultiCliProviderOptions = {
  provider: ProviderId
  providerModel?: string
  agentProviders: ExternalCliProvider[]
  commandName: string
}

type EnvLike = Record<string, string | undefined>

function getFlagValue(argv: string[], flag: string): string | undefined {
  const eq = argv.find(arg => arg.startsWith(`${flag}=`))
  if (eq) return eq.slice(flag.length + 1)

  const index = argv.indexOf(flag)
  if (index >= 0) return argv[index + 1]
  return undefined
}

export function parseAgentProviderList(
  value: string | undefined,
): ExternalCliProvider[] {
  const parsed = (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(isExternalCliProvider)

  return parsed.length > 0 ? parsed : [...EXTERNAL_CLI_PROVIDERS]
}

export function parseProviderOptions(
  argv: string[],
  env: EnvLike = process.env,
  commandName = env.CLAUDE_HAHA_COMMAND_NAME ?? 'claude-haha',
): MultiCliProviderOptions {
  const cliProvider = getFlagValue(argv, '--provider')
  const envProvider = env.CLAUDE_HAHA_PROVIDER
  const defaultProvider = commandName === 'claude-oh' ? 'auto' : 'anthropic'
  const provider = isProviderId(cliProvider)
    ? cliProvider
    : isProviderId(envProvider)
      ? envProvider
      : defaultProvider

  return {
    provider,
    providerModel:
      getFlagValue(argv, '--provider-model') ??
      env.CLAUDE_HAHA_PROVIDER_MODEL,
    agentProviders: parseAgentProviderList(
      getFlagValue(argv, '--agent-providers') ??
        env.CLAUDE_HAHA_AGENT_PROVIDERS,
    ),
    commandName,
  }
}

export function configureProviderEnvFromArgv(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): MultiCliProviderOptions {
  const options = parseProviderOptions(
    argv,
    env,
    env.CLAUDE_HAHA_COMMAND_NAME,
  )

  env.CLAUDE_HAHA_PROVIDER = options.provider
  if (options.providerModel) {
    env.CLAUDE_HAHA_PROVIDER_MODEL = options.providerModel
  }
  env.CLAUDE_HAHA_AGENT_PROVIDERS = options.agentProviders.join(',')

  return options
}
