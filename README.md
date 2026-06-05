# swagger-to-ts

[![npm](https://img.shields.io/npm/v/swagger-to-ts)](https://www.npmjs.com/package/swagger-to-ts)
[![npm](https://img.shields.io/npm/dt/swagger-to-ts)](https://www.npmjs.com/package/swagger-to-ts)
[![GitHub stars](https://img.shields.io/github/stars/arbing/swagger-to-ts?style=social)](https://github.com/arbing/swagger-to-ts)

> Generate typescript services and models from Swagger

## Requirements

- Node.js 22+
- PNPM 10+

## Install

```bash
pnpm add -D swagger-to-ts
```

## Usage

```bash
swagger-to-ts --docUrl https://swagger/v2/api-docs --baseUrl /api --paths /pets,/users --outputDir ./dist
```

Or use a config file:

```bash
swagger-to-ts --configPath ./codegen.config.json
```

```json
{
  "docUrl": "https://swagger/v2/api-docs",
  "docVersion": "2.0",
  "baseName": "",
  "baseUrl": "/api",
  "templateDir": "",
  "outputDir": "./dist",
  "paths": [],
  "excludePaths": [],
  "tagIndex": 0,
  "apiCut": [],
  "pathReplace": []
}
```

## CLI Options

| Option               | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `-c, --configPath`   | Config file path, for example `./codegen.config.json`                      |
| `-d, --docUrl`       | Swagger or OpenAPI document URL/file path                                  |
| `-n, --baseName`     | Service name prefix                                                        |
| `-b, --baseUrl`      | Request path prefix                                                        |
| `-t, --templateDir`  | Custom template directory                                                  |
| `-o, --outputDir`    | Output directory                                                           |
| `-p, --paths`        | Included API paths, comma separated                                        |
| `-e, --excludePaths` | Excluded API paths, comma separated                                        |
| `--tagIndex`         | Path segment index used as API tag                                         |
| `--apiCut`           | Path segment indexes ignored in generated operation names, comma separated |
| `--pathReplace`      | Request path replacement pair, comma separated                             |

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Release

Publishing is handled by GitHub Actions with npm Trusted Publisher. Create a GitHub Release after npm has trusted publishing configured for this repository.
