import { join } from 'node:path'

const __dirname = import.meta.dirname

export const rgPath = join(
  __dirname,
  '..',
  'bin',
  `rg${process.platform === 'win32' ? '.exe' : ''}`,
)
