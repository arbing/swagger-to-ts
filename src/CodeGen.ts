import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import SwaggerParser from '@apidevtools/swagger-parser'
import { OpenAPIV2, IJsonSchema } from 'openapi-types'
import Mustache from 'mustache'
import _ from 'lodash'

export interface GenConfig {
  docUrl: string
  baseUrl: string
  templateDir: string
  outputDir: string
  paths: string[]
}

export const defaultConfig: GenConfig = {
  docUrl: '',
  baseUrl: '',
  templateDir: '',
  outputDir: '',
  paths: [],
}

type HttpMethod = 'get' | 'post'
const httpMethods: HttpMethod[] = ['get', 'post']

interface ApiDef {
  name: string
  operations: OperationDef[]
}

interface OperationDef {
  apiName: string
  path: string
  method: string
  name: string
  fullName: string
  summary?: string
  paramsType?: string
  paramsRequired?: boolean
  dataType?: string
  dataRequired?: boolean
  returnType: string
  hasBody: boolean
  hasArgs: boolean
  hasReturn: boolean
}

interface ModelDef {
  name: string
  className: string
  description?: string
  parent?: string
  properties: PropertyDef[]
}

interface PropertyDef {
  name: string
  description?: string
  type: string
  required?: boolean
}

interface ViewModel extends Record<string, any> {
  '-first'?: boolean
  '-last'?: boolean
}

function toViewDataList<T extends Record<string, any>>(list: Array<T & ViewModel>) {
  for (let index = 0; index < list.length; index++) {
    const item = list[index] as T & ViewModel
    if (index === 0) {
      item['-first'] = true
    }
    if (index === list.length - 1) {
      item['-last'] = true
    }
  }
  return list
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function extractApiName(path: string) {
  const arr = path.split('/')
  return arr.length > 2 ? arr[arr.length - 2] : arr[arr.length - 1]
}

function extractOperationName(path: string) {
  const arr = path.split('/')
  return arr[arr.length - 1]
}

function extractApiOperationFullName(path: string) {
  const arr = path.split('/').filter((d) => !!d)
  if (arr.length > 3) {
    arr.splice(1, arr.length - 3)
  }
  return arr.map((d) => _.camelCase(d)).join('_')
}

export class CodeGen {
  #config: Required<GenConfig> = defaultConfig

  #doc: OpenAPIV2.Document = (undefined as unknown) as OpenAPIV2.Document

  #apis: Set<string> = new Set()

  #operations: OperationDef[] = []

  #models: ModelDef[] = []

  private constructor(config: GenConfig) {
    this.#config = { ...defaultConfig, ...config }
  }

  static create(config: GenConfig) {
    return new CodeGen(config)
  }

  async gen() {
    await this.fetchSwagger()

    await this.parsePaths()

    await this.genApis()

    await this.genModels()
  }

  private async fetchSwagger() {
    try {
      console.log(`[INFO]: 下载 Swagger..., apiUrl: ${this.#config.docUrl}`)
      const doc = await SwaggerParser.parse(this.#config.docUrl)
      this.#doc = doc as OpenAPIV2.Document

      const outputDir = path.join(this.#config.outputDir)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      const fileOptions = { encoding: 'utf-8' }

      const text = JSON.stringify(this.#doc, undefined, 2)
      fs.writeFileSync(path.join(outputDir, `api-docs.json`), text, fileOptions)
    } catch (error) {
      console.error(chalk.red('[ERROR]: 下载 Swagger 失败'))
      throw error
    }
  }

  private async parsePaths() {
    const apiPaths = this.#config.paths || []
    const pathKeys = apiPaths.length
      ? Object.keys(this.#doc.paths).filter((path) => apiPaths.some((s) => path.includes(s)))
      : Object.keys(this.#doc.paths)

    console.log(`[INFO]: 解析接口..., paths: ${pathKeys.length}, apiPaths: ${this.#config.paths}`)

    for (const path of pathKeys) {
      const pathItem = this.#doc.paths[path] as OpenAPIV2.PathItemObject
      for (const method of httpMethods) {
        const opItem = pathItem[method]
        if (!opItem) {
          continue
        }

        const apiName = extractApiName(path)

        const paramsTypeInfo = this.resolveOperationParamsType(path, opItem)
        if (paramsTypeInfo) {
          paramsTypeInfo.type = this.fixModelType(paramsTypeInfo.type) as string
        }

        const dataTypeInfo = this.resolveOperationDataType(path, opItem)
        if (dataTypeInfo) {
          dataTypeInfo.type = this.fixModelType(dataTypeInfo.type)
        }

        let returnType = this.resolveOperationReturnType(path, opItem)
        returnType = this.fixModelType(returnType) as string

        const hasArgs = !!paramsTypeInfo?.type || !!dataTypeInfo?.type
        const hasBody = method !== 'get'
        const hasReturn = !!returnType && returnType !== 'void'

        const fullPath = this.#config.baseUrl ? this.#config.baseUrl + path : path
        const operation: OperationDef = {
          apiName: apiName,
          path: fullPath,
          method: hasReturn ? method : 'download',
          name: extractOperationName(path),
          fullName: extractApiOperationFullName(fullPath),
          summary: opItem?.summary,
          paramsType: paramsTypeInfo?.type,
          paramsRequired: paramsTypeInfo?.required,
          dataType: dataTypeInfo?.type,
          dataRequired: dataTypeInfo?.required,
          returnType,
          hasBody,
          hasArgs,
          hasReturn,
        }
        this.#operations.push(operation)

        this.#apis.add(apiName)
      }
    }
  }

  private resolveOperationParamsType(path: string, operation: OpenAPIV2.OperationObject) {
    if (!operation.parameters) {
      return undefined
    }

    const parameters = operation.parameters
      .map((d) => d as OpenAPIV2.GeneralParameterObject)
      .filter((d) => d.in === 'query')
    if (!parameters.length) {
      return undefined
    }

    const properties: PropertyDef[] = []
    for (const parameter of parameters) {
      const type = this.resolveItemsType(parameter)
      const property: PropertyDef = {
        name: parameter.name,
        description: parameter.description,
        type,
        required: parameter.required,
      }
      properties.push(property)
    }

    const paramsType = capitalizeFirstLetter(extractOperationName(path)) + 'Params'

    const model: ModelDef = {
      name: paramsType,
      className: paramsType,
      description: `${operation.summary}`,
      properties: properties,
    }
    const required = !!properties.some((d) => !!d.required)

    this.#models.push(model)

    return { type: paramsType, required }
  }

  private resolveOperationDataType(path: string, operation: OpenAPIV2.OperationObject) {
    if (!operation.parameters) {
      return undefined
    }

    const parameters = operation.parameters
      .map((d) => d as OpenAPIV2.InBodyParameterObject)
      .filter((d) => d.in === 'body')
    if (!parameters.length) {
      return undefined
    }

    if (parameters.length > 1) {
      console.warn(chalk.yellow(`[WARN]: ${path} InBody 参数超过一个了`))
    }

    const inBody = parameters[0]
    const dataType = this.resolveSchemaType(inBody.schema)
    const required = !!inBody.required

    return { type: dataType, required }
  }

  private resolveOperationReturnType(path: string, operation: OpenAPIV2.OperationObject) {
    let type: string | undefined = undefined
    const response: OpenAPIV2.Response = operation.responses['200']

    if ('schema' in response) {
      const schema = (response as OpenAPIV2.ResponseObject).schema
      if (schema) {
        type = this.resolveSchemaType(schema)
      }
    } else {
      const refObj = response as OpenAPIV2.ReferenceObject
      type = this.resolveReferenceType(refObj)
    }

    if (!type) {
      console.warn(chalk.yellow(`[WARN]: ${path} 返回值类型为空`))
      return 'void'
    }

    return type
  }

  private resolveSchemaType(schema: OpenAPIV2.Schema) {
    if ('$ref' in schema) {
      const refObj = schema as OpenAPIV2.ReferenceObject
      return this.resolveReferenceType(refObj)
    } else {
      const schemaObj = schema as OpenAPIV2.SchemaObject
      return this.resolveSchemaObjectType(schemaObj)
    }
  }

  private resolveReferenceType(refObj: OpenAPIV2.ReferenceObject) {
    const ref = refObj.$ref
    if (!ref) {
      return undefined
    }
    const definition = this.getRef(ref)
    if (!definition) {
      return undefined
    }

    const modelFullType = this.getRefKey(ref)

    const isGenericType = this.isGenericType(modelFullType)
    const genericTypes = this.extractGenericType(modelFullType)
    const [modelName, className] = isGenericType
      ? this.normalizeGenericType(modelFullType)
      : [modelFullType, modelFullType]

    const properties: PropertyDef[] = []
    if (definition.properties) {
      for (const [key, prop] of Object.entries(definition.properties)) {
        let type = prop.type as string

        if (prop.$ref !== ref && (!prop.items || prop.items.$ref !== ref)) {
          type = this.resolveSchemaObjectType(prop) as string
        }

        if (!prop.type && prop.$ref) {
          if (prop.$ref !== ref) {
            // 递归处理Model
            type = this.resolveReferenceType(prop as OpenAPIV2.ReferenceObject) as string
          }

          if (isGenericType) {
            if (type && genericTypes.includes(type)) {
              type = 'T'
            }
          }
        } else if (prop.additionalProperties) {
          const propAddProperties = prop.additionalProperties as IJsonSchema
          if ('items' in propAddProperties && propAddProperties.items) {
            const propAddItems = propAddProperties.items as OpenAPIV2.ItemsObject
            if (propAddItems.$ref) {
              if (propAddItems.$ref !== ref) {
                // 递归处理Model
                this.resolveReferenceType(propAddItems as OpenAPIV2.ReferenceObject) as string
              }
            }
          }

          if (isGenericType) {
            type = 'T'
          }
        } else if (prop.items) {
          const propItems = prop.items as OpenAPIV2.ItemsObject
          if (propItems.$ref) {
            if (propItems.$ref !== ref) {
              // 递归处理Model
              this.resolveReferenceType(propItems as OpenAPIV2.ReferenceObject) as string
            }

            const propType = this.getRefKey(propItems.$ref)
            if (isGenericType) {
              if (genericTypes.includes(propType)) {
                type = type.replace(new RegExp(propType, 'g'), 'T')
              }
            } else {
              type = `List«${propType}»`
            }
          } else if (propItems.type === 'any') {
            if (isGenericType) {
              type = 'T'
            }
          }
        }

        const propertyType = this.fixModelType(type) as string

        const property: PropertyDef = {
          name: key,
          description: prop.description,
          type: propertyType,
          required: definition.required && definition.required.includes(key),
        }

        // fix Result<T>
        if (className === 'Result<T>' && key === 'result') {
          property.type = 'T'
        }

        properties.push(property)
      }
    }

    if (this.isBuiltinType(modelName)) {
      return this.convertBuiltinType(modelName)
    }

    const model: ModelDef = {
      name: modelName,
      className: className,
      description: definition.description,
      properties: properties,
    }

    if (this.#models.find((d) => d.name === modelName)) {
      return modelFullType
    }
    this.#models.push(model)

    return modelFullType
  }

  private resolveSchemaObjectType(schemaObj: OpenAPIV2.SchemaObject) {
    let type = schemaObj.type as string | undefined

    if (type) {
      type = this.convertBuiltinType(type, schemaObj.format)
      if (!type) {
      }

      if (schemaObj.items) {
        const itemsType = this.resolveItemsType(schemaObj.items)
        type = `${type}<${itemsType}>`
      }
    }

    return type
  }

  private resolveItemsType(item: OpenAPIV2.ItemsObject) {
    let type = this.convertBuiltinType(item.type, item.format)
    if (!type) {
      if (item.$ref) {
        // 递归处理Model
        type = this.resolveReferenceType(item as OpenAPIV2.ReferenceObject) as string
      }
    }

    if (item.items) {
      const itemsType = this.resolveItemsType(item.items)
      type = `${type}<${itemsType}>`
    }

    return type
  }

  private getRef(ref: string) {
    if (!ref) {
      return undefined
    }
    if (!this.#doc.definitions) {
      return undefined
    }

    const refKey = this.getRefKey(ref)

    return this.#doc.definitions[refKey]
  }

  private getRefKey(ref: string) {
    const key = ref.replace('#/definitions/', '')
    return key
  }

  private isGenericType(type: string) {
    return (type.includes('«') && type.includes('»')) || (type.includes('<') && type.includes('>'))
  }

  private isMultGenericType(type: string) {
    return this.isGenericType(type) && type.includes(',')
  }

  private extractGenericType(type: string) {
    return [
      ...new Set(
        type
          .replace(/«/g, '|')
          .replace(/»/g, '|')
          .replace(/</g, '|')
          .replace(/>/g, '|')
          .replace(/,/g, '|')
          .split('|')
          .filter((s) => !!s),
      ),
    ]
  }

  #builtinType: Record<string, string> = {
    void: 'void',
    boolean: 'boolean',
    string: 'string',
    integer: 'number',
    int: 'number',
    int32: 'number',
    int64: 'number',
    number: 'number',
    Number: 'number',
    'date-time': 'number',
    Date: 'number',
    array: 'Array',
    Array: 'Array',
    List: 'Array',
    Set: 'Array',
    Map: 'Record',
    any: 'any',
    object: 'any',
    Object: 'any',
    T: 'T',
    T1: 'T1',
    T2: 'T2',
    T3: 'T3',
  }

  private isBuiltinType(type: string) {
    return !!this.#builtinType[type]
  }

  private convertBuiltinType(type: string, format?: string) {
    const typeOrFormat = format || type
    if (this.isBuiltinType(typeOrFormat)) {
      type = this.#builtinType[typeOrFormat]
    }

    return type
  }

  private fixModelType(fullType?: string) {
    if (!fullType) {
      return undefined
    }

    let modelType = fullType

    const types = this.extractGenericType(modelType)
    for (const type of types) {
      if (this.isBuiltinType(type)) {
        const builtinType = this.convertBuiltinType(type)
        if (builtinType === type) {
          continue
        }

        const regex = new RegExp(`[^\\w]?${type}[^\\w]`, 'g')
        const matchArr: RegExpMatchArray | null = modelType.match(regex)
        if (!matchArr) {
          continue
        }

        for (const match of matchArr) {
          modelType = modelType.replace(match, match.replace(type, builtinType))
        }
      } else {
        const regex = new RegExp(`[^\\w]?${type}[^\\w]`, 'g')
        const matchArr: RegExpMatchArray | null = modelType.match(regex)
        if (matchArr) {
          for (const match of matchArr) {
            modelType = modelType.replace(match, match.replace(type, `models.${type}`))
          }
        } else {
          modelType = modelType.replace(new RegExp(type, 'g'), `models.${type}`)
        }
      }
    }

    modelType = modelType.replace(/«/g, '<').replace(/»/g, '>')

    return modelType
  }

  private normalizeGenericType(str: string) {
    const type = str.substr(0, str.indexOf('«'))
    return [type, `${type}<T>`]
  }

  private async genApis() {
    const apisDir = path.join(this.#config.outputDir)
    if (!fs.existsSync(apisDir)) {
      fs.mkdirSync(apisDir, { recursive: true })
    }

    const fileOptions = { encoding: 'utf-8' }
    const apiTemplatePath = path.join(this.#config.templateDir, 'api.mustache')
    if (!fs.existsSync(apiTemplatePath)) {
      throw new Error(`[ERROR]: 模版文件 ${apiTemplatePath} 不存在`)
    }
    const apiTemplate = fs.readFileSync(apiTemplatePath, fileOptions)

    const apiNames = [...this.#apis]
    apiNames.sort()
    const apis = toViewDataList(
      apiNames.map((d) => {
        const name = d
        return {
          name,
        }
      }),
    )

    for (const api of apis) {
      const operations = toViewDataList(this.#operations.filter((d) => d.apiName === api.name))

      console.log(`[INFO]: 生成 api..., apiName: ${api.name}, operations: ${operations.length}`)

      const text = Mustache.render(apiTemplate, { api, operations })
      fs.writeFileSync(path.join(apisDir, `${api.name}.ts`), text, fileOptions)
    }

    const baseName = _.camelCase(this.#config.baseUrl.replace(/\//g, ''))

    const apisTemplatePath = path.join(this.#config.templateDir, 'apis.mustache')
    if (!fs.existsSync(apisTemplatePath)) {
      throw new Error(`[ERROR]: 模版文件 ${apisTemplatePath} 不存在`)
    }
    const apisTemplate = fs.readFileSync(apisTemplatePath, fileOptions)
    const text = Mustache.render(apisTemplate, { baseName, apis: apis })
    fs.writeFileSync(path.join(apisDir, `index.ts`), text, fileOptions)

    console.log(
      chalk.green(`[INFO]: 生成 api 成功, apis: ${apis.length}, total operations: ${this.#operations.length}`),
    )
  }

  private async genModels() {
    const modelsDir = path.join(this.#config.outputDir, 'models')
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true })
    }

    const fileOptions = { encoding: 'utf-8' }
    const modelTemplatePath = path.join(this.#config.templateDir, 'model.mustache')
    if (!fs.existsSync(modelTemplatePath)) {
      throw new Error(`[ERROR]: 模版文件 ${modelTemplatePath} 不存在`)
    }
    const modelTemplate = fs.readFileSync(path.join(this.#config.templateDir, 'model.mustache'), fileOptions)

    this.#models.sort((a, b) => a.name.localeCompare(b.name))
    const models = toViewDataList(this.#models)
    for (const model of models) {
      model.properties = toViewDataList(model.properties)
      const text = Mustache.render(modelTemplate, { model })
      fs.writeFileSync(path.join(modelsDir, `${model.name}.ts`), text, fileOptions)
    }

    const modelsTemplatePath = path.join(this.#config.templateDir, 'models.mustache')
    if (!fs.existsSync(modelsTemplatePath)) {
      throw new Error(`[ERROR]: 模版文件 ${modelsTemplatePath} 不存在`)
    }
    const modelsTemplate = fs.readFileSync(path.join(this.#config.templateDir, 'models.mustache'), fileOptions)
    const text = Mustache.render(modelsTemplate, { models: models })
    fs.writeFileSync(path.join(modelsDir, `index.ts`), text, fileOptions)

    console.log(chalk.green(`[INFO]: 生成 model 成功, models: ${models.length}`))
  }
}
