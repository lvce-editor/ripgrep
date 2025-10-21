import { test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import nock from 'nock'
import { createServer } from 'node:http'
import * as os from 'node:os'

// Mock only pathExists
const mockPathExists = jest.fn()

// Mock execa
const mockExeca = jest.fn()

// Mock extract-zip
const mockExtractZip = jest.fn()

// Mock tempy
const mockTemporaryFile = jest.fn()

// Mock xdg-basedir
jest.unstable_mockModule('xdg-basedir', () => ({
  xdgCache: '/mock/cache',
}))

// Mock all the dependencies
jest.unstable_mockModule('path-exists', () => ({
  pathExists: mockPathExists,
}))

jest.unstable_mockModule('execa', () => ({
  execa: mockExeca,
}))

jest.unstable_mockModule('extract-zip', () => ({
  default: mockExtractZip,
  extractZip: mockExtractZip,
}))

jest.unstable_mockModule('tempy', () => ({
  temporaryFile: mockTemporaryFile,
}))

jest.unstable_mockModule('node:os', () => ({
  default: {
    platform: () => 'linux',
    arch: () => 'x64',
  },
  platform: () => 'linux',
  arch: () => 'x64',
}))

// Import the modules after mocking
const { downloadRipGrep, downloadFile } = await import(
  '../src/downloadRipGrep.js'
)

let mockServer
let serverUrl

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks()

  // Create a mock HTTP server
  mockServer = createServer((req, res) => {
    if (req.url === '/test-file.tar.gz') {
      res.writeHead(200, { 'Content-Type': 'application/gzip' })
      res.end('mock-tar-gz-content')
    } else if (req.url === '/error') {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    }
  })

  const { promise, resolve } = Promise.withResolvers()
  mockServer.listen(0, () => {
    const port = mockServer.address().port
    serverUrl = `http://localhost:${port}`
    resolve()
  })
  return promise
})

afterEach(() => {
  nock.cleanAll()
  if (mockServer) {
    mockServer.close()
  }
})

test('downloadRipGrep should handle HTTP 500 error', async () => {
  // Mock GitHub API to return 500 error
  nock('https://github.com')
    .get(
      '/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    )
    .reply(500, 'Internal Server Error')

  // Mock file system operations
  // @ts-ignore
  mockPathExists.mockResolvedValue(false)
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')

  await expect(downloadRipGrep()).rejects.toThrow('Failed to download')
})

test('downloadRipGrep should successfully download and extract file', async () => {
  // Mock GitHub API to return successful response
  const scope = nock('https://github.com')
    .get(/.*ripgrep-v13\.0\.0-10-x86_64-unknown-linux-musl\.tar\.gz.*/)
    .reply(200, 'mock-tar-gz-content', {
      'Content-Type': 'application/gzip',
      'Content-Length': '18',
    })

  // Mock file system operations
  // @ts-ignore
  mockPathExists.mockResolvedValue(false)
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')
  // @ts-ignore
  mockExeca.mockResolvedValue({ stdout: '', stderr: '' })

  try {
    await downloadRipGrep()
  } catch (error) {
    console.log('Error:', error.message)
    console.log('Nock pending mocks:', nock.pendingMocks())
    console.log('Nock active mocks:', nock.activeMocks())
    throw error
  }

  // Verify that the request was intercepted
  expect(scope.isDone()).toBe(true)

  // Verify that tar extraction was called
  expect(mockExeca).toHaveBeenCalledWith('tar', [
    'xvf',
    expect.stringContaining(
      '/mock/cache/vscode-ripgrep/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    ),
    '-C',
    expect.stringContaining('/bin'),
  ])
})

test('downloadRipGrep should use cached file when it exists', async () => {
  // Mock file system operations - file already exists
  // @ts-ignore
  mockPathExists.mockResolvedValue(true)
  // @ts-ignore
  mockExeca.mockResolvedValue({ stdout: '', stderr: '' })

  // Mock console.info to capture the cache message
  const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {})

  await downloadRipGrep()

  // Verify that the cached file message was logged
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('has been cached'),
  )

  // Verify that tar extraction was still called
  expect(mockExeca).toHaveBeenCalledWith('tar', [
    'xvf',
    expect.stringContaining(
      '/mock/cache/vscode-ripgrep/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    ),
    '-C',
    expect.stringContaining('/bin'),
  ])

  consoleSpy.mockRestore()
})

test('downloadFile should handle download errors', async () => {
  // Mock GitHub API to return 404 error
  nock('https://github.com')
    .get(
      '/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    )
    .reply(404, 'Not Found')

  // Mock file system operations
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')

  await expect(
    downloadFile(
      'https://github.com/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
      '/tmp/test.tar.gz',
    ),
  ).rejects.toThrow('Failed to download')
})
