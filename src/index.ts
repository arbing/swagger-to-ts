#!/usr/bin/env node

import chalk from 'chalk'
import { program } from 'commander'
import path from 'path'
import { CodeGen, GenConfig, defaultConfig } from './CodeGen'
import { loadConfig } from './config'

async function main() {
  try {
    program
      .version(require('../package.json').version)
      .option('-c, --configPath [type]', '指定配置文件路径，如: ./codegen.config.json', '')
      .option('-d, --docUrl [type]', '指定Swagger文档地址，如: https://localhost/v2/api-docs', '')
      .option('-n, --baseName [type]', '指定服务名称', '')
      .option('-b, --baseUrl [type]', '指定接口路径前缀', '')
      .option('-t, --templateDir [type]', '指定自定义模版文件目录', '')
      .option('-o, --outputDir [type]', '指定生成目录', '')
      .option('-p, --paths [type]', '指定哪些接口路径可以生成，逗号分隔', '')
      .option('-e, --excludePaths [type]', '指定哪些接口路径排除在外不生成，逗号分隔', '')
      .option('--tagIndex [type]', '指定接口tag在path路径的索引位置', '')
      .option('--apiCut [type]', '指定path路径哪些索引位置不参与接口名称拼接，逗号分隔', '')
      .option('--pathReplace [type]', '指定请求path路径替换，逗号分隔', '')
      .parse(process.argv)

    const options = program.opts()

    let genConfig: GenConfig = defaultConfig
    if (options.configPath) {
      genConfig = loadConfig(options.configPath)
    } else {
      genConfig = {
        docUrl: options.docUrl,
        docVersion: '2.0',
        baseName: options.baseName,
        baseUrl: options.baseUrl,
        templateDir: options.templateDir,
        outputDir: options.outputDir,
        paths: options.paths ? (options.paths as string).split(',') : [],
        excludePaths: options.excludePaths ? (options.excludePaths as string).split(',') : [],
        tagIndex: options.tagIndex ? Number(options.tagIndex) : undefined,
        apiCut: options.apiCut ? (options.apiCut as string).split(',').map(Number) : [],
        pathReplace: options.pathReplace ? (options.pathReplace as string).split(',') : [],
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
