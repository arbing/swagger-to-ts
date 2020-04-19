#!/usr/bin/env node

import chalk from 'chalk'
import { program } from 'commander'
import path from 'path'
import { CodeGen } from './CodeGen'

async function main() {
  try {
    program
      .version(require('../package.json').version)
      .option('-u, --apiUrl [type]', 'Swagger docs url, eg: https://localhost/v2/api-docs', '')
      .option('-p, --apiPaths [type]', 'use to match operations', '')
      .option('-b, --basePath [type]', 'api path prefix', '')
      .option('-t, --templateDir [type]', 'template dir', '')
      .option('-o, --outputDir [type]', 'the output dir to write to', '')
      .parse(process.argv)

    const genConfig = {
      apiUrl: program.apiUrl as string,
      apiPaths: program.apiPaths as string,
      basePath: program.basePath as string,
      templateDir: (program.templateDir as string) || path.join(__dirname, '..', 'template'),
      outputDir: (program.outputDir as string) || path.join(process.cwd(), 'dist'),
    }

    const codeGen = CodeGen.create(genConfig)

    await codeGen.gen()

    process.exit(0)
  } catch (error) {
    console.error(chalk.red(error))

    process.exit(1)
  }
}

main()
