import fs from 'fs'
import path from 'path'
import { parse, ParseError, printParseErrorCode } from 'jsonc-parser'
import { GenConfig } from './CodeGen'

export function loadConfig(configPath: string) {
  const fullPath = path.resolve(process.cwd(), configPath)
  const text = fs.readFileSync(fullPath, 'utf-8')
  const errors: ParseError[] = []
  const config = parse(text, errors, { allowTrailingComma: true })

  if (errors.length) {
    const error = errors[0]
    throw new Error(`配置文件 JSONC 格式错误: ${printParseErrorCode(error.error)} at offset ${error.offset}`)
  }

  return config as GenConfig
}
