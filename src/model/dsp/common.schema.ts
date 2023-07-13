export interface LDReference {
  '@id': string
}

export interface LDMultilanguage {
  '@value': string
  '@language': string
}

export interface LDTime {
  '@value': string
  '@type': 'xsd:dateTime'
}

export interface LDDecimal {
  '@value': string
  '@type': 'xsd:decimal'
}

export interface LDDuration {
  '@value': string
  '@type': 'xsd:duration'
}

export interface LDURI {
  '@value': string
  '@type': 'xsd:anyURI'
}

export type LDValue = LDReference | LDMultilanguage | LDTime | LDDecimal | LDDuration | LDURI;