export interface ContextDto {
  "@context"?: "http://localhost:8080/dspace/v0.8/context.json"
}

export interface ReferenceDto {
  '@id': string
}

export interface MultilanguageDto {
  '@value': string
  '@language': string
}

export interface TimeDto {
  '@value': string
  '@type': 'xsd:dateTime'
}

export interface DecimalDto {
  '@value': string
  '@type': 'xsd:decimal'
}

export interface DurationDto {
  '@value': string
  '@type': 'xsd:duration'
}

export interface URIDto {
  '@value': string
  '@type': 'xsd:anyURI'
}

export type ValueDto = ReferenceDto | MultilanguageDto | TimeDto | DecimalDto | DurationDto | URIDto;