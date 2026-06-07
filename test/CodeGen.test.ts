import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { CodeGen } from '../src/CodeGen'

const tempDirs: string[] = []

function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-to-ts-'))
  tempDirs.push(tempDir)
  return tempDir
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

describe('CodeGen', () => {
  it('generates apis and models from a swagger file', async () => {
    const tempDir = createTempDir()
    const docPath = path.join(tempDir, 'swagger.json')
    const outputDir = path.join(tempDir, 'output')

    fs.writeFileSync(
      docPath,
      JSON.stringify({
        swagger: '2.0',
        info: {
          title: 'Pet API',
          version: '1.0.0',
        },
        paths: {
          '/api/pets/list': {
            get: {
              summary: 'List pets',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  type: 'integer',
                  required: false,
                  description: 'Page size',
                },
              ],
              responses: {
                200: {
                  description: 'ok',
                  schema: {
                    $ref: '#/definitions/Result«Pet»',
                  },
                },
              },
            },
          },
        },
        definitions: {
          'Result«Pet»': {
            type: 'object',
            properties: {
              data: {
                $ref: '#/definitions/Pet',
              },
            },
          },
          Pet: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'integer',
                description: 'Pet id',
              },
              name: {
                type: 'string',
                description: 'Pet name',
              },
            },
          },
        },
      }),
    )

    await CodeGen.create({
      docUrl: docPath,
      docVersion: '2.0',
      baseName: '',
      baseUrl: '/base',
      templateDir: path.join(process.cwd(), 'template'),
      outputDir,
      paths: ['/pets'],
      excludePaths: [],
      apiCut: [],
      pathReplace: ['/api', '/openapi'],
    }).gen()

    const apiText = fs.readFileSync(path.join(outputDir, 'pets.ts'), 'utf-8')
    const petText = fs.readFileSync(path.join(outputDir, 'models', 'Pet.ts'), 'utf-8')
    const resultText = fs.readFileSync(path.join(outputDir, 'models', 'Result.ts'), 'utf-8')

    expect(apiText).toContain('export function base_openapi_pets_list')
    expect(apiText).toContain("get<models.Result<models.Pet>>('/base/openapi/pets/list'")
    expect(apiText).toContain('params?: models.OpenapiPetsListGetParams')
    expect(petText).toContain('id: number')
    expect(petText).toContain('name?: string')
    expect(resultText).toContain('export interface Result<T>')
    expect(resultText).toContain('data?: T')
  })

  it('generates apis and models from an OpenAPI 3 file', async () => {
    const tempDir = createTempDir()
    const docPath = path.join(tempDir, 'openapi.json')
    const outputDir = path.join(tempDir, 'output')

    fs.writeFileSync(
      docPath,
      JSON.stringify({
        openapi: '3.0.1',
        info: {
          title: 'Role API',
          version: '1.0.0',
        },
        paths: {
          '/sys/role/list': {
            post: {
              summary: 'List roles',
              parameters: [
                {
                  name: 'pageNo',
                  in: 'query',
                  schema: {
                    type: 'integer',
                  },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/RoleQuery',
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'ok',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/RolePage',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            RoleQuery: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
            RolePage: {
              type: 'object',
              properties: {
                records: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Role',
                  },
                },
              },
            },
            Role: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                },
              },
            },
          },
        },
      }),
    )

    await CodeGen.create({
      docUrl: docPath,
      docVersion: '3.0.1',
      baseName: '',
      baseUrl: '/api',
      templateDir: path.join(process.cwd(), 'template'),
      outputDir,
      paths: ['/sys/role/list'],
      excludePaths: ['exportXls'],
      apiCut: [],
      pathReplace: [],
    }).gen()

    const apiText = fs.readFileSync(path.join(outputDir, 'role.ts'), 'utf-8')
    const rolePageText = fs.readFileSync(path.join(outputDir, 'models', 'RolePage.ts'), 'utf-8')

    expect(apiText).toContain('export function api_sys_role_list')
    expect(apiText).toContain('params?: models.SysRoleListPostParams')
    expect(apiText).toContain('data: models.RoleQuery')
    expect(apiText).toContain('post<models.RolePage>')
    expect(rolePageText).toContain('records?: Array<models.Role>')
  })
})
