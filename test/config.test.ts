import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'

const originalCwd = process.cwd()
const tempDirs: string[] = []

function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-to-ts-config-'))
  tempDirs.push(tempDir)
  return tempDir
}

afterEach(() => {
  process.chdir(originalCwd)
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

describe('loadConfig', () => {
  it('loads jsonc config with comments and trailing commas', () => {
    const tempDir = createTempDir()
    process.chdir(tempDir)
    fs.mkdirSync('.vscode')
    fs.writeFileSync(
      path.join('.vscode', 'codegen.json'),
      `{
        // Swagger document URL
        "docUrl": "./swagger.json",
        "docVersion": "2.0",
        "baseName": "pet",
        "baseUrl": "/api",
        "templateDir": "./template",
        "outputDir": "./dist",
        "paths": ["/pets"],
        "excludePaths": [],
        "apiCut": [0],
        "pathReplace": ["/api", ""],
      }`,
    )

    const config = loadConfig('.vscode/codegen.json')

    expect(config.docUrl).toBe('./swagger.json')
    expect(config.paths).toEqual(['/pets'])
    expect(config.pathReplace).toEqual(['/api', ''])
  })
})
