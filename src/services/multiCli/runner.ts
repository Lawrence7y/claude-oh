import { spawn } from 'node:child_process'

export type CliProcessResult = {
  code: number | null
  stdout: string
  stderr: string
}

export type CliProcessRunner = (
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
) => Promise<CliProcessResult>

function splitLines(buffer: string): string[] {
  return buffer.split(/\r?\n/).filter(line => line.length > 0)
}

function quoteWindowsShellArg(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ')
  if (!/[\s"&|<>^%]/.test(normalized)) return normalized

  return `"${normalized
    .replace(/(["])/g, '^$1')
    .replace(/([&|<>^])/g, '^$1')
    .replace(/%/g, '%%')}"`
}

export const runCliProcess: CliProcessRunner = (
  command,
  args,
  cwd,
  env = process.env,
) =>
  new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const useShell = process.platform === 'win32'
    const child = spawn(
      useShell
        ? [command, ...args].map(quoteWindowsShellArg).join(' ')
        : command,
      useShell ? [] : args,
      {
      cwd,
      env,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    child.stdout?.on('data', data => {
      stdout += String(data)
    })
    child.stderr?.on('data', data => {
      stderr += String(data)
    })
    child.on('error', reject)
    child.on('close', code => resolve({ code, stdout, stderr }))
  })

export function outputLines(result: CliProcessResult): string[] {
  return [...splitLines(result.stdout), ...splitLines(result.stderr)]
}
