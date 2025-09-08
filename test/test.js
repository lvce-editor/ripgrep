import { execa } from 'execa'
import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir, platform } from 'os'
import { join } from 'path'
import { rgPath } from '../src/index.js'

const getTmpDir = () => {
  return mkdtemp(join(tmpdir(), 'foo-'))
}

test('rgPath', async () => {
  const tmpDir = await getTmpDir()
  await writeFile(`${tmpDir}/sample-file.txt`, 'sample text')
  const command = platform() === 'android' ? 'rg' : rgPath
  const { stdout } = await execa(command, ['sample', '.'], { cwd: tmpDir })
  expect(stdout).toContain('sample-file.txt:sample text')
})
