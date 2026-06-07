type JsonObject = Record<string, any>

function rewriteRef(value: string) {
  return value.replace('#/components/schemas/', '#/definitions/')
}

function convertRefs<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => convertRefs(item)) as T
  }

  if (value && typeof value === 'object') {
    const result: JsonObject = {}
    for (const [key, item] of Object.entries(value as JsonObject)) {
      result[key] = key === '$ref' && typeof item === 'string' ? rewriteRef(item) : convertRefs(item)
    }
    return result as T
  }

  return value
}

function pickJsonSchema(content?: JsonObject) {
  if (!content) {
    return undefined
  }

  return (content['application/json'] || content['*/*'] || Object.values(content)[0])?.schema
}

function convertParameters(operation: JsonObject) {
  const parameters = [...(operation.parameters || [])].map((parameter) => {
    const convertedParameter = convertRefs(parameter) as JsonObject
    if (convertedParameter.schema) {
      Object.assign(convertedParameter, convertRefs(convertedParameter.schema))
      delete convertedParameter.schema
    }
    return convertedParameter
  })
  const schema = pickJsonSchema(operation.requestBody?.content)
  if (schema) {
    parameters.push({
      name: 'body',
      in: 'body',
      required: !!operation.requestBody?.required,
      schema: convertRefs(schema),
    })
  }
  return parameters
}

function convertResponses(responses: JsonObject = {}) {
  const result: JsonObject = {}
  for (const [status, response] of Object.entries(responses)) {
    const responseObject = convertRefs(response) as JsonObject
    const schema = pickJsonSchema(responseObject.content)
    if (schema) {
      responseObject.schema = convertRefs(schema)
    }
    delete responseObject.content
    result[status] = responseObject
  }
  return result
}

export function convertOpenApi3ToSwagger2(doc: JsonObject) {
  const paths: JsonObject = {}
  for (const [apiPath, pathItem] of Object.entries(doc.paths || {})) {
    const convertedPathItem: JsonObject = {}
    for (const [key, value] of Object.entries(pathItem as JsonObject)) {
      if (!value || typeof value !== 'object' || !('responses' in value)) {
        convertedPathItem[key] = convertRefs(value)
        continue
      }

      const operation = value as JsonObject
      convertedPathItem[key] = {
        ...convertRefs(operation),
        parameters: convertParameters(operation),
        responses: convertResponses(operation.responses),
      }
      delete convertedPathItem[key].requestBody
    }
    paths[apiPath] = convertedPathItem
  }

  return {
    ...doc,
    swagger: '2.0',
    paths,
    definitions: convertRefs(doc.components?.schemas || {}),
  }
}
