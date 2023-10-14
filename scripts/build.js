import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path, { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dist = join(root, 'dist')

const readJson = async (path) => {
  const content = await readFile(path, 'utf8')
  return JSON.parse(content)
}

const writeJson = async (path, json) => {
  await writeFile(path, JSON.stringify(json, null, 2) + '\n')
}

const getGitTagFromGit = async () => {
  const { stdout, stderr, exitCode } = await execa(
    'git',
    ['describe', '--exact-match', '--tags'],
    {
      reject: false,
    },
  )
  if (exitCode) {
    if (
      exitCode === 128 &&
      stderr.startsWith('fatal: no tag exactly matches')
    ) {
      return '0.0.0-dev'
    }
    return '0.0.0-dev'
  }
  if (stdout.startsWith('v')) {
    return stdout.slice(1)
  }
  return stdout
}

const getVersion = async () => {
  const { env } = process
  const { RG_VERSION, GIT_TAG } = env
  if (RG_VERSION) {
    if (RG_VERSION.startsWith('v')) {
      return RG_VERSION.slice(1)
    }
    return RG_VERSION
  }
  if (GIT_TAG) {
    if (GIT_TAG.startsWith('v')) {
      return GIT_TAG.slice(1)
    }
    return GIT_TAG
  }
  return getGitTagFromGit()
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })

const version = await getVersion()

const packageJson = await readJson(join(root, 'package.json'))

delete packageJson.scripts['test']
delete packageJson.scripts['test:watch']
delete packageJson.devDependencies
delete packageJson.prettier
delete packageJson.jest
packageJson.version = version

await writeJson(join(dist, 'package.json'), packageJson)

await cp(join(root, 'src'), join(dist, 'src'), {
  recursive: true,
})

await cp(join(root, 'README.md'), join(dist, 'README.md'))
await cp(join(root, 'LICENSE'), join(dist, 'LICENSE'))
await cp(
  join(root, 'ThirdPartyNotices.txt'),
  join(dist, 'ThirdPartyNotices.txt'),
)
