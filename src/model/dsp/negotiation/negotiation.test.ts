import { deserialize } from "../../serialize";
import { Reference, Time, URI } from "../common";
import {
  Action,
  Agreement,
  Constraint,
  Duty,
  LeftOperand,
  Offer,
  Operator,
  Permission,
  Prohibition,
} from "./negotiation";

test("Contract offer serialization", () => {
  const offer = new Offer({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: new Reference({
      id: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    }),
    assignee: new Reference({
      id: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    }),
    permission: [
      new Permission({
        action: Action.USE,
        target: new Reference({
          id: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        }),
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
        target: new Reference({
          id: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        }),
      }),
    ],
  });

  const offerSerialized = offer.serialize();
  expect(offerSerialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Offer",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": {
      "@id": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    },
    "odrl:assignee": {
      "@id": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
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
  });
  const deserialized = deserialize<Offer>(offerSerialized);
  expect(offer).toStrictEqual(deserialized);
});


test("Contract agreement serialization", () => {
  const agreement = new Agreement({
    id: "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    assigner: new Reference({
      id: "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    }),
    assignee: new Reference({
      id: "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
    }),
    timestamp: new Time("2023-01-01T00:00:00Z"),
    consumerId: "Consumer A",
    providerId: "Provider 1",
    permission: [
      new Permission({
        action: Action.USE,
        target: new Reference({
          id: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        }),
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
        target: new Reference({
          id: "urn:uuid:340eab1a-f3ee-471f-a0ad-beadddc521b6",
        }),
      }),
    ],
  });

  const agreementSerialized = agreement.serialize();
  expect(agreementSerialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "odrl:Agreement",
    "@id": "urn:uuid:8d613f77-3dde-4286-88ff-c1ab96da6d59",
    "odrl:assigner": {
      "@id": "urn:uuid:1adde502-3c96-48ac-83ff-a02fabd24b4f",
    },
    "odrl:assignee": {
      "@id": "urn:uuid:e02bb9f5-8af0-4826-b1f7-e1acbc2697b2",
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
    "dspace:timestamp": {
      "@type": "xsd:dateTime",
      "@value": "2023-01-01T00:00:00Z",
    },
    "dspace:consumerId": "Consumer A",
    "dspace:providerId": "Provider 1",
  });
  const deserialized = deserialize<Agreement>(agreementSerialized);
  expect(agreement).toStrictEqual(deserialized);
});
