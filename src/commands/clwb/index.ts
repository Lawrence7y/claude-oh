import type { Command } from '../../commands.js'

const clwb = {
  type: 'local',
  name: 'clwb',
  description: 'Run a multi-CLI pipeline (code-review, review-code, dual-review)',
  aliases: ['pipeline'],
  supportsNonInteractive: true,
  load: () => import('./clwb.js'),
} satisfies Command

export default clwb