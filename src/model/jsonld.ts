import jsonld, { ContextDefinition, JsonLdDocument, Options } from "jsonld";
import { JsonLdObj, RemoteDocument } from "jsonld/jsonld-spec";

// TODO: Move towards hosted context on w3id.org or https://github.com/International-Data-Spaces-Association/ids-specification/raw/main/common/schema/context.json
const context: ContextDefinition = {
  odrl: "http://www.w3.org/ns/odrl/2/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  cred: "https://www.w3.org/2018/credentials#",
  sec: "https://w3id.org/security#",
  foaf: "http://xmlns.com/foaf/0.1/",
  cc: "http://creativecommons.org/ns#",
  dct: "http://purl.org/dc/terms/",
  dcat: "http://www.w3.org/ns/dcat#",
  dspace: "https://w3id.org/dspace/v0.8/",
  "dspace:timestamp": { "@type": "xsd:dateTime" },
  "dspace:transportType": { "@type": "@id" },
  "dct:title": { "@language": "en" },
  "dct:issued": { "@type": "xsd:dateTime" },
  "dct:modified": { "@type": "xsd:dateTime" },
  "dct:created": { "@type": "xsd:dateTime" },
  "dcat:byteSize": { "@type": "xsd:decimal" },
  "dcat:endpointURL": { "@type": "xsd:anyURI" },
  "dspace:agreementId": { "@type": "@id" },
  "dspace:dataset": { "@type": "@id" },
  "dct:publisher": { "@type": "@id" },
  "dct:format": { "@type": "@id" },
  "dct:type": { "@type": "@id" },
  "odrl:assigner": { "@type": "@id" },
  "odrl:assignee": { "@type": "@id" },
  "odrl:action": { "@type": "@id" },
  "odrl:target": { "@type": "@id" },
  "odrl:leftOperand": { "@type": "@id" },
  "odrl:operator": { "@type": "@id" },
  "odrl:rightOperandReference": { "@type": "@id" },
  "odrl:profile": { "@type": "@id" },
  "dspace:reason": { "@container": "@set" },
  "dspace:catalog": { "@container": "@set" },
  "dspace:filter": { "@container": "@set" },
  "dspace:endpointProperties": { "@container": "@set" },
  "dct:description": { "@container": "@set" },
  "odrl:hasPolicy": { "@container": "@set" },
  "odrl:permission": { "@container": "@set" },
  "odrl:prohibition": { "@container": "@set" },
  "odrl:duty": { "@container": "@set" },
  "odrl:constraint": { "@container": "@set" },
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const nodeDocumentLoader = (jsonld as any).documentLoaders.node();
const jsonldOptions: Options.DocLoader = {
  async documentLoader(url): Promise<RemoteDocument> {
    if (url === "https://w3id.org/dspace/v0.8/context.json") {
      const remoteDocument: RemoteDocument = {
        contextUrl: undefined,
        document: {
          "@context": context,
        },
        documentUrl: url,
      };
      return remoteDocument;
    }
    return nodeDocumentLoader(url);
  },
};

export async function compact(
  document: JsonLdDocument,
  internal: boolean,
): Promise<JsonLdObj> {
  const expanded = await jsonld.expand(document, jsonldOptions);
  const usingContext: ContextDefinition = internal
    ? context
    : { ...context, "@language": "en" };
  const compacted = await jsonld.compact(expanded, usingContext, {
    ...jsonldOptions,
  });
  compacted["@context"] = "https://w3id.org/dspace/v0.8/context.json";
  return compacted;
}
