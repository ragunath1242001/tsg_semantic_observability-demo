export default {
  "@context": {
    "@import": "https://w3id.org/dspace/2025/1/odrl-profile.jsonld",
    tsg: "https://dataspac.es/ns/tsg#",
    iana: "https://www.iana.org/assignments/media-types/",

    contactPoint: {
      "@id": "dcat:contactPoint",
      "@type": "@id"
    },
    keyword: {
      "@id": "dcat:keyword",
      "@language": "en",
      "@container": "@set"
    },
    landingPage: {
      "@id": "dcat:landingPage",
      "@type": "@id"
    },
    theme: {
      "@id": "dcat:theme",
      "@type": "@id",
      "@container": "@set"
    },
    conformsTo: {
      "@id": "dct:conformsTo",
      "@type": "@id",
      "@container": "@set"
    },
    creator: {
      "@id": "dct:creator",
      "@type": "@id"
    },
    description: {
      "@id": "dct:description",
      "@container": "@set"
    },
    identifier: {
      "@id": "dct:identifier",
      "@type": "@id"
    },
    isReferencedBy: {
      "@id": "dct:isReferencedBy",
      "@type": "@id"
    },
    issued: {
      "@id": "dct:issued",
      "@type": "xsd:dateTime"
    },
    language: {
      "@id": "dct:language",
      "@type": "@id"
    },
    license: {
      "@id": "dct:license",
      "@type": "@id"
    },
    modified: {
      "@id": "dct:modified",
      "@type": "xsd:dateTime"
    },
    publisher: {
      "@id": "dct:publisher",
      "@type": "@id"
    },
    relation: {
      "@id": "dct:relation",
      "@type": "@id"
    },
    title: {
      "@id": "dct:title",
      "@language": "en"
    },
    type: {
      "@id": "dct:type",
      "@type": "@id"
    },
    hasVersion: {
      "@id": "dcat:hasVersion",
      "@type": "@id",
      "@container": "@set"
    },
    isVersionOf: {
      "@id": "dcat:isVersionOf",
      "@type": "@id"
    },
    version: {
      "@id": "dcat:version",
      "@type": "xsd:string"
    },
    hasCurrentVersion: {
      "@id": "dcat:hasCurrentVersion",
      "@type": "@id"
    },
    previousVersion: {
      "@id": "dcat:previousVersion",
      "@type": "@id"
    },

    servesDataset: {
      "@id": "dcat:servesDataset",
      "@type": "@id"
    },
    accessURL: {
      "@id": "dcat:accessURL",
      "@type": "@id"
    },
    byteSize: {
      "@id": "dcat:byteSize",
      "@type": "xsd:integer"
    },
    compressFormat: {
      "@id": "dcat:compressFormat",
      "@type": "@id"
    },
    downloadURL: {
      "@id": "dcat:downloadURL",
      "@type": "@id"
    },
    mediaType: {
      "@id": "dcat:mediaType",
      "@type": "@id"
    },
    packageFormat: {
      "@id": "dcat:packageFormat",
      "@type": "@id"
    },
    spatialResolutionInMeters: {
      "@id": "dcat:spatialResolutionInMeters",
      "@type": "xsd:decimal"
    },
    temporalResolution: {
      "@id": "dcat:temporalResolution",
      "@type": "xsd:duration"
    },

    accrualPeriodicity: {
      "@id": "dct:accrualPeriodicity",
      "@type": "@id"
    },
    spatial: {
      "@id": "dct:spatial",
      "@type": "@id"
    },
    temporal: {
      "@id": "dct:temporal",
      "@type": "@id"
    },
    wasGeneratedBy: {
      "@id": "prov:wasGeneratedBy"
    },

    primaryTopic: {
      "@id": "foaf:primaryTopic"
    },

    record: {
      "@id": "dcat:record"
    },
    themeTaxonomy: {
      "@id": "dcat:themeTaxonomy",
      "@type": "@id"
    },
    hasPart: {
      "@id": "dcat:hasPart"
    },
    homepage: {
      "@id": "dcat:homepage",
      "@type": "@id"
    },

    Resource: {
      "@id": "dcat:Resource"
    },

    created: {
      "@id": "dct:created",
      "@type": "xsd:dateTime"
    },

    hasPolicy: {
      "@id": "odrl:hasPolicy",
      "@container": "@set"
    },

    hashedMessage: {
      "@id": "tsg:hashedMessage"
    },
    algorithm: {
      "@id": "tsg:algorithm",
      "@type": "xsd:string"
    },
    digest: {
      "@id": "tsg:digest",
      "@type": "xsd:string"
    },

    timestamp: {
      "@id": "dspace:timestamp"
    }
  }
};
