import { JsonLdDocument, compact } from "jsonld";

test("Compaction of JSON-LD", async () => {
  const document: JsonLdDocument = {
    "@context": {
      "dspace": "https://w3id.org/dspace/v0.8/",
      "odrl": "http://www.w3.org/ns/odrl/2/",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "cred": "https://www.w3.org/2018/credentials#",
      "sec": "https://w3id.org/security#",
      "foaf": "http://xmlns.com/foaf/0.1/",
      "cc": "http://creativecommons.org/ns#",
      "dct": "http://purl.org/dc/terms/",
      "dcat": "http://www.w3.org/ns/dcat#",
    },
    "@type": "odrl:Offer",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": {
      "@id": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    },
    "odrl:assignee": {
      "@id": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    },
    "dspace:timestamp": {
      "@type": "xsd:dateTime",
      "@value": "2023-07-13T10:05:35.208Z"
    },
    "odrl:permission": [
      {
        "@type": "odrl:Permission",
        "odrl:action": "odrl:use",
        "odrl:target": {
          "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        },
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:rightOperand": {
              "@type": "xsd:anyURI",
              "@value": "http://example.com/purposeX",
            },
            "odrl:leftOperand": "odrl:purpose",
            "odrl:operator": "odrl:eq",
          },
        ],
        "odrl:duty": [
          {
            "@type": "odrl:Duty",
            "odrl:action": "odrl:inform",
          },
        ],
      },
    ],
    "odrl:prohibition": [
      {
        "@type": "odrl:Prohibition",
        "odrl:action": "odrl:distribute",
        "odrl:target": {
          "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        },
      },
    ],
  };
  const context = {
    odrl: "http://www.w3.org/ns/odrl/2/",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    cred: "https://www.w3.org/2018/credentials#",
    sec: "https://w3id.org/security#",
    foaf: "http://xmlns.com/foaf/0.1/",
    cc: "http://creativecommons.org/ns#",
    dct: "http://purl.org/dc/terms/",
    dcat: "http://www.w3.org/ns/dcat#",
    dspace: "https://w3id.org/dspace/v0.8/",
    "@language": "en",
    "dspace:timestamp": {"@type": "xsd:dateTime"},
    "dspace:transportType": {"@type": "@id"},
    "dct:issued": {"@type": "xsd:dateTime"},
    "dct:modified": {"@type": "xsd:dateTime"},
    "dct:created": {"@type": "xsd:dateTime"},
    "dcat:byteSize": {"@type": "xsd:decimal"},
    "dcat:endpointURL": {"@type": "xsd:anyURI"},
    "dspace:agreementId": {"@type": "@id"},
    "dspace:dataset": {"@type": "@id"},
    "odrl:assigner": {"@type": "@id"},
    "odrl:assignee": {"@type": "@id"},
    "odrl:action": {"@type": "@id"},
    "odrl:target": {"@type": "@id"},
    "odrl:leftOperand": {"@type": "@id"},
    "odrl:operator": {"@type": "@id"},
    "odrl:rightOperandReference": {"@type": "@id"},
    "odrl:profile": {"@type": "@id"}
  };
  const result = await compact(document, context);
});
