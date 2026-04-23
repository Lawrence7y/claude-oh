import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

describe('package bin metadata', () => {
  it('publishes claude-oh as the only bin entry', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

    expect(pkg.bin['claude-oh']).toBe('./bin/claude-oh')
    expect(pkg.bin['claude-haha']).toBeUndefined()
  })
})
