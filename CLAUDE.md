# swagger-to-ts

## 项目概览

`swagger-to-ts` 是一个 TypeScript CLI，用于从 Swagger/OpenAPI 文档生成 API service 和 models。

## 技术栈

- Node.js 22+
- PNPM 10+
- TypeScript
- Vitest
- GitHub Actions

## 常用命令

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 发布

npm 发布使用 GitHub Actions + npm Trusted Publisher。发布前需要在 npm 包设置中绑定本仓库的 publish workflow。
