import type { Command } from '../../commands.js'

const providers = {
  type: 'local',
  name: 'providers',
  description: 'Show Claude/Codex/OpenCode provider availability',
  aliases: ['provider'],
  supportsNonInteractive: true,
  load: () => import('./providers.js'),
} satisfies Command

export default providers
