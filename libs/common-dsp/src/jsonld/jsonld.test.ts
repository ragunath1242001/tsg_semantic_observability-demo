import { describe, expect, test } from "@jest/globals";
import { JsonLdDocument } from "jsonld";

import { OfferDto } from "../model/dsp/index.js";
import { defaultContext, setJsonLdDebugContexts } from "./context.defaults.js";
import { compact } from "./jsonld.js";

const document: JsonLdDocument = {
  "@context": ["https://w3id.org/dspace/2025/1/odrl-profile.jsonld"],
  "@type": "Offer",
  "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
  assigner: {
    "@id": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f"
  },
  assignee: {
    "@id": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2"
  },
  permission: [
    {
      "@type": "Permission",
      action: "use",
      target: {
        "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      },
      constraint: [
        {
          "@type": "Constraint",
          rightOperand: {
            "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
            "@value": "http://example.com/purposeX"
          },
          leftOperand: "purpose",
          operator: "eq"
        }
      ],
      duty: [
        {
          "@type": "Duty",
          action: "inform"
        }
      ]
    }
  ],
  prohibition: [
    {
      "@type": "Prohibition",
      action: "distribute",
      target: {
        "@id": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      }
    }
  ]
};

const expected: OfferDto = {
  "@context": defaultContext(),
  "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
  "@type": "Offer",
  assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
  assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
  permission: [
    {
      "@type": "Permission",
      action: "use",
      constraint: [
        {
          "@type": "Constraint",
          leftOperand: "purpose",
          operator: "eq",
          rightOperand: {
            "@type": "xsd:anyURI",
            "@value": "http://example.com/purposeX"
          }
        }
      ],
      duty: [{ "@type": "Duty", action: "inform" }],
      target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
    }
  ],
  prohibition: [
    {
      "@type": "Prohibition",
      action: "distribute",
      target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
    }
  ]
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
  }
};

describe("JSON LD Tests", () => {
  test("Compaction of JSON-Dto", async () => {
    expect(await compact(document)).toStrictEqual(expected);
    const odrlCompaction = await compact(
      document,
      "http://www.w3.org/ns/odrl.jsonld"
    );
    expect(odrlCompaction).toStrictEqual(expectedOdrlContext);
  });

  test("Version error", async () => {
    setJsonLdDebugContexts(false, "0.0.0");
    await expect(compact(document)).rejects.toThrowError(
      "Dereferencing a URL did not result in a valid JSON-LD object."
    );
  });
});
