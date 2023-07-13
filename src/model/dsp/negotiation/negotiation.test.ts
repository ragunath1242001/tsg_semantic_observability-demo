import { deserialize } from "../../serialize";
import { Reference, Time, URI } from "../common";
import {
  Agreement,
  Constraint,
  Duty,
  Offer,
  Permission,
  Prohibition,
} from "./negotiation";
import { Action, LeftOperand, Operator } from "./negotiation.schema";

test("Contract offer serialization", async () => {
  const offer = new Offer({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    permission: [
      new Permission({
        action: Action.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          new Constraint({
            leftOperand: LeftOperand.PURPOSE,
            operator: Operator.EQ,
            rightOperand: new URI("http://example.com/purposeX"),
          }),
        ],
        duty: [
          new Duty({
            action: Action.INFORM,
          }),
        ],
      }),
    ],
    prohibition: [
      new Prohibition({
        action: Action.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      }),
    ],
  });

  const offerSerialized = await offer.serialize();
  expect(offerSerialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Offer",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    "odrl:assignee": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    "odrl:permission": [
      {
        "@type": "odrl:Permission",
        "odrl:action": "odrl:use",
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
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
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      },
    ],
  });
  const deserialized = await deserialize<Offer>(offerSerialized);
  expect(offer).toStrictEqual(deserialized);
});


test("Contract agreement serialization", async () => {
  const agreement = new Agreement({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    assignee: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    timestamp: "2023-01-01T00:00:00Z",
    consumerId: "Consumer A",
    providerId: "Provider 1",
    permission: [
      new Permission({
        action: Action.USE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        constraint: [
          new Constraint({
            leftOperand: LeftOperand.PURPOSE,
            operator: Operator.EQ,
            rightOperand: new URI("http://example.com/purposeX"),
          }),
        ],
        duty: [
          new Duty({
            action: Action.INFORM,
          }),
        ],
      }),
    ],
    prohibition: [
      new Prohibition({
        action: Action.DISTRIBUTE,
        target: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      }),
    ],
  });

  const agreementSerialized = await agreement.serialize();
  expect(agreementSerialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Agreement",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    "odrl:assignee": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    "odrl:permission": [
      {
        "@type": "odrl:Permission",
        "odrl:action": "odrl:use",
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
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
        "odrl:target": "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
      },
    ],
    "dspace:timestamp": "2023-01-01T00:00:00Z",
    "dspace:consumerId": "Consumer A",
    "dspace:providerId": "Provider 1",
  });
  const deserialized = await deserialize<Agreement>(agreementSerialized);
  expect(agreement).toStrictEqual(deserialized);
});
