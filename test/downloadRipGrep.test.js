import {
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals'
import nock from 'nock'

// Use a real filesystem temp cache and mock only what must not run (tar)
const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
const { join } = await import('node:path')
const { tmpdir } = await import('node:os')

const tempCacheDir = mkdtempSync(join(tmpdir(), 'ripgrep-test-'))
const tempBinDir = mkdtempSync(join(tmpdir(), 'ripgrep-bin-'))

// Force predictable platform/arch for URL/target without mocking core 'os'
const originalEnv = { ...process.env }
process.env.platform = 'linux'
process.env.npm_config_arch = 'x64'

// Provide cache location used by the implementation
jest.unstable_mockModule('xdg-basedir', () => ({
  xdgCache: tempCacheDir,
}))

// Mock only tar execution
/** @type {any} */
const mockExeca = jest.fn()
jest.unstable_mockModule('execa', () => ({
  execa: mockExeca,
}))

// Import after mocks
const { downloadRipGrep, downloadFile } = await import(
  '../src/downloadRipGrep.js'
)

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
  process.env = originalEnv
})

beforeEach(() => {
  jest.clearAllMocks()
  nock.cleanAll()
})

test('downloadRipGrep should handle network error', async () => {
  // Simulate a network failure so pipeline rejects
  nock('https://github.com')
    .get(
      '/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    )
    .replyWithError('simulated error')

  await expect(downloadRipGrep(tempBinDir)).rejects.toThrow(
    'Failed to download',
  )
})

test('downloadRipGrep should successfully download and extract file', async () => {
  // Intercept the GitHub asset request with a simple 200 body
  const scope = nock('https://github.com')
    .get(
      '/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    )
    .reply(200, 'mock-tar-gz-content', {
      'Content-Type': 'application/gzip',
    })

  mockExeca.mockResolvedValue(/** @type {any} */ ({ stdout: '', stderr: '' }))

  await downloadRipGrep(tempBinDir)

  expect(scope.isDone()).toBe(true)
  expect(mockExeca).toHaveBeenCalledWith('tar', [
    'xvf',
    expect.stringContaining(
      `${tempCacheDir}/vscode-ripgrep/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz`,
    ),
    '-C',
    tempBinDir,
  ])
})

test('downloadRipGrep should use cached file when it exists', async () => {
  // Prepare a cached file on disk
  const cachedDir = join(tempCacheDir, 'vscode-ripgrep')
  mkdirSync(cachedDir, { recursive: true })
  const cachedFile = join(
    cachedDir,
    'ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
  )
  writeFileSync(cachedFile, 'already-downloaded')

  mockExeca.mockResolvedValue(/** @type {any} */ ({ stdout: '', stderr: '' }))
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})

  await downloadRipGrep(tempBinDir)

  expect(infoSpy).toHaveBeenCalledWith(
    expect.stringContaining('has been cached'),
  )
  expect(mockExeca).toHaveBeenCalledWith('tar', [
    'xvf',
    cachedFile,
    '-C',
    tempBinDir,
  ])

  infoSpy.mockRestore()
})

test('downloadFile should handle download errors', async () => {
  // Make the stream fail to ensure pipeline rejects
  nock('https://github.com')
    .get(
      '/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    )
    .replyWithError('simulated error')

  await expect(
    downloadFile(
      'https://github.com/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
      join(tmpdir(), 'test.tar.gz'),
    ),
  ).rejects.toThrow(
    `Failed to download \"https://github.com/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz\": RequestError: simulated error`,
  )
})
