import { test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import nock from 'nock'
import { createServer } from 'node:http'
import * as os from 'node:os'

// Mock fs operations
const mockFs = {
  mkdir: jest.fn(),
  move: jest.fn(),
  pathExists: jest.fn(),
}

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
jest.unstable_mockModule('fs-extra', () => ({
  default: {
    mkdir: mockFs.mkdir,
    move: mockFs.move,
  },
  mkdir: mockFs.mkdir,
  move: mockFs.move,
}))

jest.unstable_mockModule('path-exists', () => ({
  pathExists: mockFs.pathExists,
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
  const scope = nock('https://release-assets.githubusercontent.com')
    .get(/.*ripgrep-v13\.0\.0-10-x86_64-unknown-linux-musl\.tar\.gz.*/)
    .reply(500, 'Internal Server Error')

  // Mock file system operations
  // @ts-ignore
  mockFs.pathExists.mockResolvedValue(false)
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')

  await expect(downloadRipGrep()).rejects.toThrow('Failed to download')
})

test('downloadRipGrep should successfully download and extract file', async () => {
  // Mock GitHub API to return successful response
  const scope = nock('https://release-assets.githubusercontent.com')
    .get(/.*ripgrep-v13\.0\.0-10-x86_64-unknown-linux-musl\.tar\.gz.*/)
    .reply(200, 'mock-tar-gz-content', {
      'Content-Type': 'application/gzip',
      'Content-Length': '18',
    })

  // Mock file system operations
  // @ts-ignore
  mockFs.pathExists.mockResolvedValue(false)
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')
  // @ts-ignore
  mockFs.mkdir.mockResolvedValue(undefined)
  // @ts-ignore
  mockFs.move.mockResolvedValue(undefined)
  // @ts-ignore
  mockExeca.mockResolvedValue({ stdout: '', stderr: '' })

  await downloadRipGrep()

  // Verify that directories were created
  expect(mockFs.mkdir).toHaveBeenCalledWith(
    expect.stringContaining('/mock/cache/vscode-ripgrep'),
    { recursive: true },
  )
  expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('/bin'), {
    recursive: true,
  })

  // Verify that the file was moved to cache
  expect(mockFs.move).toHaveBeenCalledWith(
    '/tmp/mock-temp-file',
    expect.stringContaining(
      '/mock/cache/vscode-ripgrep/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    ),
  )

  // Verify that tar extraction was called
  expect(mockExeca).toHaveBeenCalledWith('tar', [
    'xvf',
    expect.stringContaining(
      '/mock/cache/vscode-ripgrep/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
    ),
    '-C',
    expect.stringContaining('/bin'),
  ])

  // Clean up nock scope
  scope.done()
})

test('downloadRipGrep should use cached file when it exists', async () => {
  // Mock file system operations - file already exists
  // @ts-ignore
  mockFs.pathExists.mockResolvedValue(true)
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
  const scope = nock('https://release-assets.githubusercontent.com')
    .get(/.*ripgrep-v13\.0\.0-10-x86_64-unknown-linux-musl\.tar\.gz.*/)
    .reply(404, 'Not Found')

  // Mock file system operations
  mockTemporaryFile.mockReturnValue('/tmp/mock-temp-file')

  await expect(
    downloadFile(
      'https://github.com/microsoft/ripgrep-prebuilt/releases/download/v13.0.0-10/ripgrep-v13.0.0-10-x86_64-unknown-linux-musl.tar.gz',
      '/tmp/test.tar.gz',
    ),
  ).rejects.toThrow('Failed to download')

  // Clean up nock scope
  scope.done()
})
