export default {
  "@context": {
    healthdcatap: "https://healthdcat-ap.github.io/#",
    prov: "http://www.w3.org/ns/prov#",
    heracles: "https://heracles.dataspac.es/ns/heracles#",
    ldp: "http://www.w3.org/ns/ldp#",
    "fdp-o": "http://www.sdsd.org/schema/fdp-o#",
    "ldp:contains": {
      "@container": "@set",
      "@type": "@id",
    },
    "fdp-o:metadataIdentifier": {
      "@type": "@id",
    },
    "fdp-o:metadataIssued": {
      "@type": "xsd:dateTime",
    },
    "fdp-o:metadataModified": {
      "@type": "xsd:dateTime",
    },
    "dcat:dataset": {
      "@container": "@set",
      "@type": "@id",
    },
    "dcat:service": {
      "@container": "@set",
      "@type": "@id",
    },
    "dcat:distribution": {
      "@container": "@set",
      "@type": "@id",
    },
    "dct:conformsTo": {
      "@container": "@set",
      "@type": "@id",
    },
    "healthdcatap:hasCodingSystem": {
      "@container": "@set",
      "@type": "@id",
    },
    "prov:startedAtTime": {
      "@type": "xsd:dateTime",
    },
    "prov:endedAtTime": {
      "@type": "xsd:dateTime",
    },
    "healthdcatap:numberOfRecords": {
      "@type": "xsd:nonNegativeInteger",
    },
    "healthdcatap:numberOfUniqueIndividuals": {
      "@type": "xsd:nonNegativeInteger",
    },
    "healthdcatap:healthTheme": {
      "@container": "@set",
      "@type": "@id",
    },
  },
};
