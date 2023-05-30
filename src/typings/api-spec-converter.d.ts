declare module 'api-spec-converter' {
  const ApiSpecConverter: {
    convert: (options: { from: string; to: string; source: string }) => any
  }

  export = ApiSpecConverter
}
