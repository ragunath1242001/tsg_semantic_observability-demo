import { JsonLdDocument } from "jsonld";
import { compact } from "./jsonld";
import { expect, test } from "@jest/globals";
import {
  defaultContext,
  dspContextUrl,
  setJsonLdDebugContexts
} from "./context.defaults";

const document: JsonLdDocument = {
  "@context": [
    "https://w3id.org/dspace/2024/1/context.json",
    "https://www.w3.org/ns/dcat.jsonld"
  ],
  "@type": "odrl:Offer",
  "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
  "odrl:assigner": {
    "@id": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f"
  },
  "odrl:assignee": {
    "@id": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2"
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
        "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      },
      "odrl:constraint": [
        {
          "@type": "odrl:Constraint",
          "odrl:rightOperand": {
            "@type": "xsd:anyURI",
            "@value": "http://example.com/purposeX"
          },
          "odrl:leftOperand": "odrl:purpose",
          "odrl:operator": "odrl:eq"
        }
      ],
      "odrl:duty": [
        {
          "@type": "odrl:Duty",
          "odrl:action": "odrl:inform"
        }
      ]
    }
  ],
  "odrl:prohibition": [
    {
      "@type": "odrl:Prohibition",
      "odrl:action": "odrl:distribute",
      "odrl:target": {
        "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      }
    }
  ]
};

const expected = {
  "@context": defaultContext(),
  "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
  "@type": "odrl:Offer",
  "odrl:assignee": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
  "odrl:assigner": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
  "odrl:permission": [
    {
      "@type": "odrl:Permission",
      "odrl:action": "odrl:use",
      "odrl:constraint": [
        {
          "@type": "odrl:Constraint",
          "odrl:leftOperand": "odrl:purpose",
          "odrl:operator": "odrl:eq",
          "odrl:rightOperand": {
            "@type": "xsd:anyURI",
            "@value": "http://example.com/purposeX"
          }
        }
      ],
      "odrl:duty": [{ "@type": "odrl:Duty", "odrl:action": "odrl:inform" }],
      "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
    }
  ],
  "odrl:prohibition": [
    {
      "@type": "odrl:Prohibition",
      "odrl:action": "odrl:distribute",
      "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
    }
  ],
  "dspace:timestamp": "2023-07-13T10:05:35.208Z"
};
const expectedOdrlContext = {
  "@context": "http://www.w3.org/ns/odrl.jsonld",
  uid: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
  type: "Offer",
  assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
  assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
  permission: {
    type: "Permission",
    action: "use",
    constraint: {
      type: "Constraint",
      leftOperand: "purpose",
      operator: "eq",
      rightOperand: {
        type: "xsd:anyURI",
        "@value": "http://example.com/purposeX"
      }
    },
    duty: {
      type: "Duty",
      action: "inform"
    },
    target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
  },
  prohibition: {
    type: "Prohibition",
    action: "distribute",
    target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
  },
  "https://w3id.org/dspace/2024/1/timestamp": {
    type: "xsd:dateTime",
    "@value": "2023-07-13T10:05:35.208Z"
  }
};

test("Compaction of JSON-Dto", async () => {
  expect(await compact(document)).toStrictEqual(expected);
  expect(await compact(document, "dsp")).toStrictEqual({
    ...expected,
    "@context": dspContextUrl
  });
  const odrlCompaction = await compact(
    document,
    "http://www.w3.org/ns/odrl.jsonld"
  );
  expect(odrlCompaction).toStrictEqual(expectedOdrlContext);
});

test("Version error", async () => {
  expect(await compact(document)).toStrictEqual(expected);
  setJsonLdDebugContexts(false, "0.0.0");
  await expect(compact(document)).rejects.toThrowError(
    "Dereferencing a URL did not result in a valid JSON-LD object."
  );
});
