import { deserialize } from "../../serialize";
import { Multilanguage, Reference } from "../common";
import { Constraint, Offer, Permission } from "../negotiation/negotiation";
import { DataService, Dataset, Distribution, Resource } from "./catalog";
import {
  CatalogDto,
  ODRLAction,
  ODRLOperator,
  ResourceDto,
} from "@tsg-dsp/common";
import { Catalog } from "./catalog";

test("Resource serialization", async () => {
  const resource = new Resource({
    id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    contactPoint: new Reference({ id: "http://example.com" }),
    keyword: ["keyword1", "keyword2"],
    landingPage: new Reference({ id: "http://example.com" }),
    title: "Resource title",
    description: [new Multilanguage("Resource description")],
    publisher: "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    hasPolicy: [
      new Offer({
        id: "urn:uuid:d5b97478-639e-49ab-a125-dbb8ea6e3259",
        assigner: "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91",
      }),
    ],
  });
  const serialized = await resource.serialize();
  const expected: ResourceDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dcat:Resource",
    "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    "dcat:contactPoint": {
      "@id": "http://example.com",
    },
    "dcat:keyword": ["keyword1", "keyword2"],
    "dcat:landingPage": {
      "@id": "http://example.com",
    },
    "dct:description": [
      {
        "@language": "en",
        "@value": "Resource description",
      },
    ],
    "dct:publisher": "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    "dct:title": "Resource title",
    "odrl:hasPolicy": [
      {
        "@id": "urn:uuid:d5b97478-639e-49ab-a125-dbb8ea6e3259",
        "@type": "odrl:Offer",
        "odrl:assigner": "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Resource>(serialized);
  expect(deserialized).toStrictEqual(resource);
});

test("Catalog serialization", async () => {
  const catalog = new Catalog({
    id: "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
    creator: "did:web:localhost",
    description: [new Multilanguage("Test connector")],
    publisher: "did:web:localhost",
    title: "Test Catalog",
    dataset: [
      new Dataset({
        id: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
        title: "HTTPBin",
        hasPolicy: [
          new Offer({
            id: "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
            assigner: "did:web:localhost",
            permission: [
              new Permission({
                action: ODRLAction.READ,
                target: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                constraint: [
                  new Constraint({
                    leftOperand: "dspace:identity",
                    rightOperand: "dspace:sameDataSpace",
                    operator: ODRLOperator.IS_PART_OF,
                  }),
                ],
              }),
            ],
          }),
        ],
        distribution: [
          new Distribution({
            id: "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
            accessService: [
              new DataService({
                id: "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                endpointURL: "http://localhost:3000/api",
              }),
            ],
            conformsTo: new Reference({ id: "https://httpbin.org/spec.json" }),
            format: "dspace:HTTP",
            title: "Version 0.9.2",
          }),
        ],
      }),
    ],
    service: [
      new DataService({
        id: "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
        endpointDescription: "dspace:connector",
        endpointURL: "https://cp.localhost/control-plane",
      }),
    ],
  });
  const serialized = await catalog.serialize();
  const expected: CatalogDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dcat:Catalog",
    "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
    "dct:creator": "did:web:localhost",
    "dct:description": [
      {
        "@value": "Test connector",
        "@language": "en",
      },
    ],
    "dct:publisher": "did:web:localhost",
    "dct:title": "Test Catalog",
    "dcat:dataset": [
      {
        "@type": "dcat:Dataset",
        "@id": "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
        "dct:title": "HTTPBin",
        "odrl:hasPolicy": [
          {
            "@type": "odrl:Offer",
            "@id": "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
            "odrl:assigner": "did:web:localhost",
            "odrl:permission": [
              {
                "@type": "odrl:Permission",
                "odrl:action": "odrl:read",
                "odrl:target": "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                "odrl:constraint": [
                  {
                    "@type": "odrl:Constraint",
                    "odrl:rightOperand": "dspace:sameDataSpace",
                    "odrl:leftOperand": "dspace:identity",
                    "odrl:operator": "odrl:isPartOf",
                  },
                ],
              },
            ],
          },
        ],
        "dcat:distribution": [
          {
            "@type": "dcat:Distribution",
            "@id": "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
            "dcat:accessService": [
              {
                "@type": "dcat:DataService",
                "@id": "urn:uuid:946b0e29-b006-430a-8e4d-ddf196104b67",
                "dcat:endpointURL": "http://localhost:3000/api",
              },
            ],
            "dct:conformsTo": { "@id": "https://httpbin.org/spec.json" },
            "dct:format": "dspace:HTTP",
            "dct:title": "Version 0.9.2",
          },
        ],
      },
    ],
    "dcat:service": [
      {
        "@type": "dcat:DataService",
        "@id": "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
        "dcat:endpointDescription": "dspace:connector",
        "dcat:endpointURL": "https://cp.localhost/control-plane",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Catalog>(serialized);
  expect(deserialized).toStrictEqual(catalog);
});

// TODO: deserialization samples
