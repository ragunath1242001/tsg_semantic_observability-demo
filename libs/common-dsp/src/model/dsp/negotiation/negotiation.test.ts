import { deserialize } from "../../deserialize";
import { defaultContext } from "../../../jsonld/context.defaults";
import { URI } from "../common";
import {
  Agreement,
  Constraint,
  Duty,
  Offer,
  Permission,
  Prohibition,
} from "./negotiation";
import {
  ODRLAction,
  ODRLLeftOperand,
  ODRLOperator,
  OfferDto,
  AgreementDto,
} from "./negotiation.dto";
import { expect, test } from "@jest/globals";

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
            rightOperand: new URI("http://example.com/purposeX"),
          }),
        ],
        duty: [
          new Duty({
            action: ODRLAction.INFORM,
          }),
        ],
      }),
    ],
    prohibition: [
      new Prohibition({
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      }),
    ],
  });

  const serialized = await offer.serialize();
  const expected: OfferDto = {
    "@context": defaultContext(),
    "@type": "odrl:Offer",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    "odrl:assignee": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    "odrl:permission": [
      {
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:rightOperand": {
              "@type": "xsd:anyURI",
              "@value": "http://example.com/purposeX",
            },
            "odrl:leftOperand": ODRLLeftOperand.PURPOSE,
            "odrl:operator": ODRLOperator.EQ,
          },
        ],
        "odrl:duty": [
          {
            "@type": "odrl:Duty",
            "odrl:action": ODRLAction.INFORM,
          },
        ],
      },
    ],
    "odrl:prohibition": [
      {
        "@type": "odrl:Prohibition",
        "odrl:action": ODRLAction.DISTRIBUTE,
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      },
    ],
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
            rightOperand: new URI("http://example.com/purposeX"),
          }),
        ],
        duty: [
          new Duty({
            action: ODRLAction.INFORM,
          }),
        ],
      }),
    ],
    prohibition: [
      new Prohibition({
        action: ODRLAction.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      }),
    ],
  });

  const serialized = await agreement.serialize();
  const expected: AgreementDto = {
    "@context": defaultContext(),
    "@type": "odrl:Agreement",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    "odrl:assignee": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    "odrl:permission": [
      {
        "@type": "odrl:Permission",
        "odrl:action": ODRLAction.USE,
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        "odrl:constraint": [
          {
            "@type": "odrl:Constraint",
            "odrl:rightOperand": {
              "@type": "xsd:anyURI",
              "@value": "http://example.com/purposeX",
            },
            "odrl:leftOperand": ODRLLeftOperand.PURPOSE,
            "odrl:operator": ODRLOperator.EQ,
          },
        ],
        "odrl:duty": [
          {
            "@type": "odrl:Duty",
            "odrl:action": ODRLAction.INFORM,
          },
        ],
      },
    ],
    "odrl:prohibition": [
      {
        "@type": "odrl:Prohibition",
        "odrl:action": ODRLAction.DISTRIBUTE,
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      },
    ],
    "dspace:timestamp": "2023-01-01T00:00:00Z",
    "odrl:target": "urn:uuid:21d38f03-3a0d-4a64-9281-45222863a04e",
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Agreement>(serialized);
  expect(agreement).toStrictEqual(deserialized);
});
