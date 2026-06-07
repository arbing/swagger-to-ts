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

Or use a JSON/JSONC config file:

```bash
swagger-to-ts --configPath ./.vscode/codegen.json
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
| `-c, --configPath`   | JSON/JSONC config file path, for example `./.vscode/codegen.json`          |
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

Publishing is handled by GitHub Actions with npm Trusted Publisher. Push a version tag like `v1.5.0`, or run the Publish workflow manually with a tag input. The workflow publishes to npm first, then creates the GitHub Release after npm publish succeeds.
