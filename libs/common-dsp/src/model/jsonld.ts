import * as jsonld from "jsonld";
import { JsonLdObj, RemoteDocument } from "jsonld/jsonld-spec";

// TODO: Move towards hosted context on w3id.org or https://github.com/International-Data-Spaces-Association/ids-specification/raw/main/common/schema/context.json
const context: jsonld.ContextDefinition = {
  // DSP
  odrl: "http://www.w3.org/ns/odrl/2/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  cred: "https://www.w3.org/2018/credentials#",
  sec: "https://w3id.org/security#",
  foaf: "http://xmlns.com/foaf/0.1/",
  cc: "http://creativecommons.org/ns#",
  dct: "http://purl.org/dc/terms/",
  dcat: "http://www.w3.org/ns/dcat#",
  dspace: "https://w3id.org/dspace/2024/1/",

  "dct:title": { "@language": "en" },
  "dct:creator": { "@type": "@id" },
  "dct:description": { "@container": "@set" },
  "dct:issued": { "@type": "xsd:dateTime" },
  "dct:modified": { "@type": "xsd:dateTime" },

  "dcat:byteSize": { "@type": "xsd:decimal" },
  // "dcat:distribution": { "@container": "@set" },
  "dcat:theme": { "@type": "@id" },
  // "dcat:conformsTo": { "@type": "@id" },
  // "dcat:dataset": { "@container": "@set" },
  "dcat:endpointURL": { "@type": "xsd:anyURI" },
  "dcat:endpointDescription": { "@type": "xsd:anyURI" },
  "dcat:keyword": { "@container": "@set" },
  "dcat:servesDataset": { "@container": "@set" },
  // "dcat:service": { "@container": "@set" },
  "dcat:accessService": { "@container": "@set" },

  "dspace:agreementId": { "@type": "@id" },
  "dspace:dataset": { "@type": "@id" },
  "dspace:transportType": { "@type": "@id" },
  "dspace:state": { "@type": "@id" },
  "dspace:providerId": { "@type": "@id" },
  "dspace:consumerId": { "@type": "@id" },
  "dspace:participantId": { "@type": "@id" },
  "dspace:reason": { "@container": "@set" },
  "dspace:catalog": { "@container": "@set" },
  "dspace:filter": { "@container": "@set" },
  "dspace:timestamp": { "@type": "xsd:dateTime" },
  "dspace:callbackAddress": { "@type": "xsd:anyURI" },
  "dspace:endpointProperties": { "@container": "@set" },

  "foaf:homepage": { "@type": "xsd:anyURI" },

  "odrl:hasPolicy": { "@container": "@set" },
  "odrl:permission": { "@container": "@set" },
  "odrl:prohibition": { "@container": "@set" },
  "odrl:obligation": { "@container": "@set" },
  "odrl:duty": { "@container": "@set" },
  "odrl:constraint": { "@container": "@set" },
  "odrl:action": { "@type": "@id" },
  "odrl:target": { "@type": "@id" },
  "odrl:leftOperand": { "@type": "@id" },
  "odrl:operator": { "@type": "@id" },
  "odrl:rightOperandReference": { "@type": "@id" },
  "odrl:profile": { "@container": "@set" },
  "odrl:assigner": { "@type": "@id" },
  "odrl:assignee": { "@type": "@id" },

  // TSG
  tsg: "https://dataspac.es/ns/tsg#",
  iana: "https://www.iana.org/assignments/media-types/",
  "dct:created": { "@type": "xsd:dateTime" },
  "dct:publisher": { "@type": "@id" },
  "dct:format": { "@type": "@id" },
  "dct:type": { "@type": "@id" },
  "dcat:hasVersion": { "@container": "@set" },

  // Heracles
  healthdcatap: "https://healthdcat-ap.github.io/#",
  prov: "http://www.w3.org/ns/prov#",
  heracles: "https://heracles.dataspac.es/ns/heracles#",
  ldp: "http://www.w3.org/ns/ldp#",
  "fdp-o": "http://www.sdsd.org/schema/fdp-o#",
  // "@language": "en",
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

  // "dcat:version": {"@type": "@id"},
  // "odrl:profile": { "@type": "@id" },
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const nodeDocumentLoader =
  (jsonld as any).documentLoaders?.node?.() ||
  (jsonld as any).documentLoaders?.xhr?.();
const jsonldOptions: jsonld.Options.DocLoader = {
  async documentLoader(url): Promise<RemoteDocument> {
    if (url === "https://w3id.org/dspace/2024/1/context.json") {
      const remoteDocument: RemoteDocument = {
        contextUrl: undefined,
        document: {
          "@context": context,
        },
        documentUrl: url,
      };
      return remoteDocument;
    }
    console.log(`Loading Document: ${url}`);
    return nodeDocumentLoader(url);
  },
};

export async function compact(
  document: jsonld.JsonLdDocument,
  internal: boolean
): Promise<JsonLdObj> {
  const expanded = await jsonld.expand(document, jsonldOptions);
  const usingContext: jsonld.ContextDefinition = internal
    ? context
    : { ...context, "@language": "en" };
  const compacted = await jsonld.compact(expanded, usingContext, {
    ...jsonldOptions,
  });
  compacted["@context"] = "https://w3id.org/dspace/2024/1/context.json";
  return compacted;
}

export async function flatten(
  document: jsonld.JsonLdDocument
): Promise<JsonLdObj> {
  return await jsonld.flatten(document);
}

export async function frame(
  document: jsonld.NodeObject,
  embed: boolean,
  internal: boolean,
  type: string | undefined
): Promise<JsonLdObj> {
  const flattened = await flatten(document);
  const usingContext: jsonld.ContextDefinition = internal
    ? context
    : { ...context, "@language": "en" };
  let usingType = type || document["@type"];
  if (!usingType) {
    throw Error(
      "Could not frame document, missing type in function call and document"
    );
  }
  return await jsonld.frame(
    flattened,
    { "@context": usingContext, "@type": usingType },
    {
      ...(embed ? { embed: "@always" } : {}),
    }
  );
}
