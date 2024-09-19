import { expect, test } from "@jest/globals";
import { deserialize } from "../../serialize";
import { Multilanguage, Reference } from "../common";
import { Constraint, Offer, Permission } from "../negotiation/negotiation";
import { ODRLAction, ODRLOperator } from "../negotiation/negotiation.dto";
import {
  Catalog,
  DataService,
  Dataset,
  Distribution,
  Resource,
} from "./catalog";
import { CatalogDto, ResourceDto } from "./catalog.dto";
import { inspect } from "util";

test("Resource serialization", async () => {
  const resource = new Resource({
    id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    contactPoint: new Reference({ id: "http://example.com" }),
    keyword: ["keyword1", "keyword2"],
    landingPage: new Reference({ id: "http://example.com" }),
    title: "Resource title",
    description: ["Resource description"],
    publisher: "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    version: "0.0.1",
    hasVersion: [
      new Reference({ id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2" }),
    ],
    isVersionOf: new Reference({
      id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    }),
    hasCurrentVersion: new Reference({
      id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    }),
    previousVersion: new Reference({
      id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    }),
    hasPolicy: [
      new Offer({
        id: "urn:uuid:d5b97478-639e-49ab-a125-dbb8ea6e3259",
        assigner: "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91",
      }),
    ],
  });
  const serialized = await resource.serialize();
  const expected: ResourceDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dcat:Resource",
    "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    "dcat:contactPoint": {
      "@id": "http://example.com",
    },
    "dcat:keyword": ["keyword1", "keyword2"],
    "dcat:landingPage": {
      "@id": "http://example.com",
    },
    "dct:description": ["Resource description"],
    "dct:publisher": "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    "dct:title": "Resource title",
    "dcat:version": "0.0.1",
    "dcat:hasVersion": [
      { "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2" },
    ],
    "dcat:isVersionOf": {
      "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    },
    "dcat:hasCurrentVersion": {
      "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    },
    "dcat:previousVersion": {
      "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    },
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
    description: ["Test connector"],
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
            conformsTo: ["https://httpbin.org/spec.json"],
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
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dcat:Catalog",
    "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
    "dct:creator": "did:web:localhost",
    "dct:description": ["Test connector"],
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
            "dct:conformsTo": ["https://httpbin.org/spec.json"],
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
  const deserialized = await deserialize<Catalog>(expected);
  expect(deserialized).toStrictEqual(catalog);
});

test("Heracles", async () => {
  const dto: CatalogDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@id": "urn:uuid:a3983705-9382-4acf-bf09-36aaf4657287",
    "@type": "dcat:Catalog",
    "dct:creator": "did:web:pharmacure.heracles.dataspac.es",
    "dct:description": ["PharmaCure Solutions connector"],
    "dct:publisher": "did:web:pharmacure.heracles.dataspac.es",
    "dct:title": "PharmaCure Solutions",
    "dcat:dataset": [
      {
        "@id": "urn:uuid:3fbde162-57c2-4923-8239-23f0df41177b",
        "@type": "dcat:Dataset",
        "adms:sample": {
          "@id": "urn:uuid:0c18379e-fe40-4cb2-b482-eda6dc7d3dd5",
          "@type": "dcat:Distribution",
          "dct:description": ["Sample dataset"],
          "dcat:downloadURL":
            "https://fdp.pharmacure.heracles.dataspac.es/dataset/00064cd3-1265-4762-b969-40d6a7d7fc56/sample/0",
          "dcat:mediaType":
            "https://www.iana.org/assignments/media-types/application/zip",
        },
        "dct:conformsTo": [
          "https://www.wikidata.org/wiki/Q125499706",
          "heracles:LMF",
        ],
        "dct:title": "IKNL NCR Synthetic Dataset",
        "dct:description": [
          "A synthetic dataset that mimics a part of the Netherlands Cancer Registry (NCR) is available for research purposes. This dataset does not contain data on real patients. It enables researchers to use record-level cancer data safely, while knowing that there is no risk of breaching patient confidentiality.",
        ],
        "dcat:distribution": [
          {
            "@id": "urn:uuid:3fbde162-57c2-4923-8239-23f0df41177b:fl",
            "@type": "dcat:Distribution",
            "dct:conformsTo": [
              "https://fdp.pharmacure.heracles.dataspac.es/distribution/0ca809b3-dbce-4451-a72b-85d9a6aa5880/spec/schema.lmf",
            ],
            "dct:format": "tsg:FL",
            "dct:title": "TSG Federated Learning Data Plane",
            "dcat:accessService": [
              {
                "@id": "urn:uuid:2a51f635-bc3e-4853-ac09-682ef169d8fc",
                "@type": "dcat:DataService",
                "dcat:endpointDescription": "dspace:connector",
                "dcat:endpointURL":
                  "https://cp.pharmacure.heracles.dataspac.es",
              },
            ],
          },
          {
            "@id":
              "https://fdp.pharmacure.heracles.dataspac.es/distribution/5ea70128-48e6-42f1-a43f-b384ecb4ee12",
            "@type": "dcat:Distribution",
            "dct:conformsTo": [
              "https://fdp.pharmacure.heracles.dataspac.es/distribution/5ea70128-48e6-42f1-a43f-b384ecb4ee12/spec/schema.lmf",
            ],
            "dct:format": "heracles:CohortService",
            "dct:title": "Cohort Definition Service",
            "dcat:accessService": [
              {
                "@id":
                  "https://fdp.pharmacure.heracles.dataspac.es/dataService/3d6594f9-d7d6-4340-bb8a-1d5290534fdd",
                "@type": "dcat:DataService",
                "dcat:endpointDescription": "heracles:cohortService",
                "dcat:endpointURL":
                  "https://fdp.pharmacure.heracles.dataspac.es/services/cohortService/00064cd3-1265-4762-b969-40d6a7d7fc56",
              },
            ],
          },
        ],
        "dcat:keyword": ["Netherlands Cancer Registry", "Synthetic"],
        "odrl:hasPolicy": [
          {
            "@type": "odrl:Offer",
            "@id": "urn:uuid:edddc008-f4b0-4ac3-a37e-2eda05956974",
            "odrl:assigner": "did:web:pharmacure.heracles.dataspac.es",
            "odrl:permission": [
              {
                "@type": "odrl:Permission",
                "odrl:action": "odrl:use",
              },
            ],
          },
        ],
        "prov:wasGeneratedBy": {
          "@type": "prov:Activity",
          "prov:endedAtTime": "2023-08-01T00:00:00Z",
          "prov:startedAtTime": "2023-08-01T00:00:00Z",
          "prov:wasAssociatedWith": {
            "@type": ["prov:Agent", "prov:SoftwareAgent"],
            "prov:actedOnBehalfOf": {
              "@type": ["prov:Agent", "prov:Organization"],
              "foaf:name": "IKNL",
            },
            "foaf:name": "Synthetic Data Generator",
          },
        },
        "healthdcatap:hasCodingSystem": [
          "https://www.wikidata.org/wiki/Q1753883",
          "https://www.wikidata.org/wiki/Property:P563",
        ],
        "healthdcatap:healthTheme": [
          "https://www.wikidata.org/wiki/Q12078",
          "https://www.wikidata.org/wiki/Q128581",
        ],
        "healthdcatap:numberOfRecords": 84000,
        "healthdcatap:numberOfUniqueIndividuals": 20000,
      },
    ],
    "dcat:service": [
      {
        "@id": "urn:uuid:2a51f635-bc3e-4853-ac09-682ef169d8fc",
        "@type": "dcat:DataService",
        "dcat:endpointDescription": "dspace:connector",
        "dcat:endpointURL": "https://cp.pharmacure.heracles.dataspac.es",
      },
      {
        "@id":
          "https://fdp.pharmacure.heracles.dataspac.es/dataService/3d6594f9-d7d6-4340-bb8a-1d5290534fdd",
        "@type": "dcat:DataService",
        "dcat:endpointDescription": "heracles:cohortService",
        "dcat:endpointURL":
          "https://fdp.pharmacure.heracles.dataspac.es/services/cohortService/00064cd3-1265-4762-b969-40d6a7d7fc56",
      },
    ],
  };
  const deserialized = await deserialize<Catalog>(dto);
  console.log(inspect(deserialized, false, null));
  const serialized = await deserialized.serialize(true);
  console.log(inspect(serialized, false, null));

  expect(serialized).toStrictEqual(dto);
});

// TODO: deserialization samples
