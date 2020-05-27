#!/usr/bin/env node

import chalk from 'chalk'
import { program } from 'commander'
import path from 'path'
import { CodeGen, GenConfig, defaultConfig } from './CodeGen'

async function main() {
  try {
    program
      .version(require('../package.json').version)
      .option('-c, --configPath [type]', '指定配置文件路径，如: ./codegen.config.json', '')
      .option('-d, --docUrl [type]', '指定Swagger文档地址，如: https://localhost/v2/api-docs', '')
      .option('-b, --baseUrl [type]', '指定接口路径前缀', '')
      .option('-t, --templateDir [type]', '指定自定义模版文件目录', '')
      .option('-o, --outputDir [type]', '指定生成目录', '')
      .option('-p, --paths [type]', '指定哪些接口路径可以生成，逗号分隔', '')
      .parse(process.argv)

    let genConfig: GenConfig = defaultConfig
    if (program.configPath) {
      genConfig = require(path.join(process.cwd(), program.configPath))
    } else {
      genConfig = {
        docUrl: program.docUrl,
        baseUrl: program.baseUrl,
        templateDir: program.templateDir,
        outputDir: program.outputDir,
        paths: program.paths ? (program.paths as string).split(',') : [],
      }
    }

    if (!genConfig.docUrl) {
      throw new Error('请指定Swagger文档地址')
    }

    if (genConfig.templateDir) {
      genConfig.templateDir = path.join(process.cwd(), genConfig.templateDir)
    } else {
      genConfig.templateDir = path.join(__dirname, '..', 'template')
    }

    if (genConfig.outputDir) {
      genConfig.outputDir = path.join(process.cwd(), genConfig.outputDir)
    } else {
      genConfig.outputDir = path.join(process.cwd(), 'dist')
    }

    const codeGen = CodeGen.create(genConfig)

    await codeGen.gen()

    process.exit(0)
  } catch (error) {
    console.error(error)

    process.exit(1)
  }
}

main()
