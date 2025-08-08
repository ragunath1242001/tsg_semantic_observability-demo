import { expect, test } from "@jest/globals";

import { defaultContext } from "../../../jsonld/context.defaults.js";
import { deserialize } from "../../deserialize.js";
import { URI } from "../common.js";
import {
  AgreementDto,
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  OfferDto
} from "./negotiation.dto.js";
import {
  Agreement,
  Constraint,
  Duty,
  Offer,
  Permission,
  Prohibition
} from "./negotiation.js";

test("Contract offer serialization", async () => {
  const offer = new Offer({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    permission: [
      new Permission({
        action: ODRLAction.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          new Constraint({
            leftOperand: ODRLLeftOperand.PURPOSE,
            operator: ODRLOperator.EQ,
            rightOperand: new URI("http://example.com/purposeX")
          })
        ],
        duty: [
          new Duty({
            action: ODRLAction.INFORM
          })
        ]
      })
    ],
    prohibition: [
      new Prohibition({
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      })
    ]
  });

  const serialized = offer.serialize();
  const expected: OfferDto = {
    "@context": defaultContext(),
    "@type": "Offer",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    permission: [
      {
        "@type": "Permission",
        action: ODRLAction.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          {
            "@type": "Constraint",
            rightOperand: {
              "@type": "xsd:anyURI",
              "@value": "http://example.com/purposeX"
            },
            leftOperand: ODRLLeftOperand.PURPOSE,
            operator: ODRLOperator.EQ
          }
        ],
        duty: [
          {
            "@type": "Duty",
            action: ODRLAction.INFORM
          }
        ]
      }
    ],
    prohibition: [
      {
        "@type": "Prohibition",
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Offer>(serialized);
  expect(offer).toStrictEqual(deserialized);
});

test("Contract agreement serialization", async () => {
  const agreement = new Agreement({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    timestamp: "2023-01-01T00:00:00Z",
    target: "urn:uuid:21d38f03-3a0d-4a64-9281-45222863a04e",
    permission: [
      new Permission({
        action: ODRLAction.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          new Constraint({
            leftOperand: ODRLLeftOperand.PURPOSE,
            operator: ODRLOperator.EQ,
            rightOperand: new URI("http://example.com/purposeX")
          })
        ],
        duty: [
          new Duty({
            action: ODRLAction.INFORM
          })
        ]
      })
    ],
    prohibition: [
      new Prohibition({
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      })
    ]
  });

  const serialized = agreement.serialize();
  const expected: AgreementDto = {
    "@context": defaultContext(),
    "@type": "Agreement",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    permission: [
      {
        "@type": "Permission",
        action: ODRLAction.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          {
            "@type": "Constraint",
            rightOperand: {
              "@type": "xsd:anyURI",
              "@value": "http://example.com/purposeX"
            },
            leftOperand: ODRLLeftOperand.PURPOSE,
            operator: ODRLOperator.EQ
          }
        ],
        duty: [
          {
            "@type": "Duty",
            action: ODRLAction.INFORM
          }
        ]
      }
    ],
    prohibition: [
      {
        "@type": "Prohibition",
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6"
      }
    ],
    timestamp: "2023-01-01T00:00:00Z",
    target: "urn:uuid:21d38f03-3a0d-4a64-9281-45222863a04e"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Agreement>(serialized);
  expect(agreement).toStrictEqual(deserialized);
});
