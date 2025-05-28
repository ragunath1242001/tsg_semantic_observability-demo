import { expect, test } from "@jest/globals";

import { defaultContext } from "../../../jsonld/context.defaults.js";
import { deserialize } from "../../deserialize.js";
import { ODRLAction, ODRLOperator } from "../negotiation/negotiation.dto.js";
import { Constraint, Offer, Permission } from "../negotiation/negotiation.js";
import { CatalogDto, ResourceDto } from "./catalog.dto.js";
import {
  Catalog,
  DataService,
  Dataset,
  Distribution,
  Resource
} from "./catalog.js";

test("Resource serialization", async () => {
  const resource = new Resource({
    id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    contactPoint: "http://example.com",
    keyword: ["keyword1", "keyword2"],
    landingPage: "http://example.com",
    title: "Resource title",
    description: ["Resource description"],
    publisher: "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    version: "0.0.1",
    hasVersion: ["urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"],
    isVersionOf: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    hasCurrentVersion: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    previousVersion: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    hasPolicy: [
      new Offer({
        id: "urn:uuid:d5b97478-639e-49ab-a125-dbb8ea6e3259",
        assigner: "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91"
      })
    ]
  });
  resource.extraProps["dct:test"] = {
    "@id": "Test"
  };
  resource.hasPolicy![0].extraProps["dct:test2"] = {
    "@id": "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91"
  };
  const serialized = await resource.serialize();
  const expected: ResourceDto = {
    "@context": defaultContext(),
    "@type": "Resource",
    "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    contactPoint: "http://example.com",
    keyword: ["keyword1", "keyword2"],
    landingPage: "http://example.com",
    description: ["Resource description"],
    publisher: "urn:uuid:b07295ed-68b5-446f-b35b-db6573cda632",
    title: "Resource title",
    version: "0.0.1",
    hasVersion: ["urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"],
    isVersionOf: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    hasCurrentVersion: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    previousVersion: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
    hasPolicy: [
      {
        "@id": "urn:uuid:d5b97478-639e-49ab-a125-dbb8ea6e3259",
        "@type": "Offer",
        assigner: "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91"
      }
    ]
  };
  expected["dct:test"] = {
    "@id": "Test"
  };
  expected["hasPolicy"]![0]["dct:test2"] = {
    "@id": "urn:uuid:ab07632c-68c3-4665-8708-533552b51e91"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Resource>(serialized);
  expect(deserialized).toStrictEqual(resource);
});

test("Catalog serialization", async () => {
  const catalog = new Catalog({
    id: "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
    participantId: "did:web:localhost",
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
                    operator: ODRLOperator.IS_PART_OF
                  })
                ]
              })
            ]
          })
        ],
        distribution: [
          new Distribution({
            id: "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
            accessService: "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
            conformsTo: ["https://httpbin.org/spec.json"],
            format: "HTTP",
            title: "Version 0.9.2"
          })
        ]
      })
    ],
    service: [
      new DataService({
        id: "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
        endpointDescription: "dspace:connector",
        endpointURL: "https://cp.localhost/control-plane"
      })
    ]
  });
  const serialized = await catalog.serialize();
  const expected: CatalogDto = {
    "@context": defaultContext(),
    "@type": "Catalog",
    "@id": "urn:uuid:a0920ac1-d08e-4ee1-acde-6dd0432b84e4",
    participantId: "did:web:localhost",
    creator: "did:web:localhost",
    description: ["Test connector"],
    publisher: "did:web:localhost",
    title: "Test Catalog",
    dataset: [
      {
        "@type": "Dataset",
        "@id": "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
        title: "HTTPBin",
        hasPolicy: [
          {
            "@type": "Offer",
            "@id": "urn:uuid:03be4d42-fde2-40b6-8351-185dbc174fb2",
            assigner: "did:web:localhost",
            permission: [
              {
                "@type": "Permission",
                action: "odrl:read",
                target: "urn:uuid:2ae6c8a5-ae9f-442a-87f3-29aa547113ff",
                constraint: [
                  {
                    "@type": "Constraint",
                    rightOperand: "dspace:sameDataSpace",
                    leftOperand: "dspace:identity",
                    operator: "isPartOf"
                  }
                ]
              }
            ]
          }
        ],
        distribution: [
          {
            "@type": "Distribution",
            "@id": "urn:uuid:7ee417b1-f83a-47f8-92be-dace11bdab5f",
            accessService: "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
            conformsTo: ["https://httpbin.org/spec.json"],
            format: "HTTP",
            title: "Version 0.9.2"
          }
        ]
      }
    ],
    service: [
      {
        "@type": "DataService",
        "@id": "urn:uuid:a2d7d253-e1f6-4cd8-b806-742e119c6023",
        endpointDescription: "dspace:connector",
        endpointURL: "https://cp.localhost/control-plane"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<Catalog>(expected);
  expect(deserialized).toStrictEqual(catalog);
});

test("HealthDCAT-AP", async () => {
  const dto: CatalogDto = {
    "@context": defaultContext(),
    "@id": "urn:uuid:a3983705-9382-4acf-bf09-36aaf4657287",
    "@type": "Catalog",
    participantId: "did:web:localhost",
    creator: "did:web:localhost",
    description: ["HealthDCAT-AP Catalog"],
    publisher: "did:web:localhost",
    title: "HealthDCAT-AP Connector",
    dataset: [
      {
        "@id": "urn:uuid:3fbde162-57c2-4923-8239-23f0df41177b",
        "@type": "Dataset",
        "adms:sample": {
          "@id": "urn:uuid:0c18379e-fe40-4cb2-b482-eda6dc7d3dd5",
          "@type": "Distribution",
          description: ["Sample dataset"],
          downloadURL:
            "https://fdp.localhost/dataset/00064cd3-1265-4762-b969-40d6a7d7fc56/sample/0",
          mediaType: "iana:application/zip"
        },
        conformsTo: [
          "https://www.wikidata.org/wiki/Q125499706",
          "http://ontology.localhost/#LMF"
        ],
        title: "Synthetic Health Dataset",
        description: [
          "A synthetic Health Dataset annotated with HealthDCAT-AP."
        ],
        distribution: [
          {
            "@id": "urn:uuid:3fbde162-57c2-4923-8239-23f0df41177b:fl",
            "@type": "Distribution",
            conformsTo: [
              "https://fdp.localhost/distribution/0ca809b3-dbce-4451-a72b-85d9a6aa5880/spec/schema.lmf"
            ],
            format: "tsg:FL",
            title: "TSG Federated Learning Data Plane",
            accessService: {
              "@id": "urn:uuid:2a51f635-bc3e-4853-ac09-682ef169d8fc",
              "@type": "DataService",
              endpointDescription: "dspace:connector",
              endpointURL: "http://cp.localhost"
            }
          },
          {
            "@id":
              "https://fdp.localhost/distribution/5ea70128-48e6-42f1-a43f-b384ecb4ee12",
            "@type": "Distribution",
            conformsTo: [
              "https://fdp.localhost/distribution/5ea70128-48e6-42f1-a43f-b384ecb4ee12/spec/schema.lmf"
            ],
            format: "http://ontology.localhost/#CohortService",
            title: "Cohort Definition Service",
            accessService: {
              "@id":
                "https://fdp.localhost/dataService/3d6594f9-d7d6-4340-bb8a-1d5290534fdd",
              "@type": "DataService",
              endpointDescription: "http://ontology.localhost/#cohortService",
              endpointURL:
                "https://fdp.localhost/services/cohortService/00064cd3-1265-4762-b969-40d6a7d7fc56"
            }
          }
        ],
        keyword: ["Health Dataset", "Synthetic"],
        hasPolicy: [
          {
            "@type": "Offer",
            "@id": "urn:uuid:edddc008-f4b0-4ac3-a37e-2eda05956974",
            assigner: "did:web:localhost",
            permission: [
              {
                "@type": "Permission",
                action: "use"
              }
            ]
          }
        ],
        wasGeneratedBy: {
          "@type": "prov:Activity",
          "prov:endedAtTime": "2023-08-01T00:00:00Z",
          "prov:startedAtTime": "2023-08-01T00:00:00Z",
          "prov:wasAssociatedWith": {
            "@type": ["prov:Agent", "prov:SoftwareAgent"],
            "prov:actedOnBehalfOf": {
              "@type": ["prov:Agent", "prov:Organization"],
              "foaf:name": "Synthetic Data Generator actor"
            },
            "foaf:name": "Synthetic Data Generator"
          }
        },
        "healthdcatap:hasCodingSystem": [
          "https://www.wikidata.org/wiki/Q1753883",
          "https://www.wikidata.org/wiki/Property:P563"
        ],
        "healthdcatap:healthTheme": [
          "https://www.wikidata.org/wiki/Q12078",
          "https://www.wikidata.org/wiki/Q128581"
        ],
        "healthdcatap:numberOfRecords": 84000,
        "healthdcatap:numberOfUniqueIndividuals": 20000
      }
    ],
    service: [
      {
        "@id": "urn:uuid:2a51f635-bc3e-4853-ac09-682ef169d8fc",
        "@type": "DataService",
        endpointDescription: "dspace:connector",
        endpointURL: "http://cp.localhost"
      },
      {
        "@id":
          "https://fdp.localhost/dataService/3d6594f9-d7d6-4340-bb8a-1d5290534fdd",
        "@type": "DataService",
        endpointDescription: "http://ontology.localhost/#cohortService",
        endpointURL:
          "https://fdp.localhost/services/cohortService/00064cd3-1265-4762-b969-40d6a7d7fc56"
      }
    ]
  };
  const deserialized = await deserialize<Catalog>(dto);
  expect(
    deserialized.dataset![0].extraProps["healthdcatap:numberOfRecords"]
  ).toBe(84000);
  expect(
    deserialized.dataset![0].extraProps[
      "healthdcatap:numberOfUniqueIndividuals"
    ]
  ).toBe(20000);
  expect(
    deserialized.dataset![0].extraProps["healthdcatap:hasCodingSystem"]
  ).toStrictEqual([
    "https://www.wikidata.org/wiki/Q1753883",
    "https://www.wikidata.org/wiki/Property:P563"
  ]);
  expect(
    deserialized.dataset![0].extraProps["healthdcatap:healthTheme"]
  ).toStrictEqual([
    "https://www.wikidata.org/wiki/Q12078",
    "https://www.wikidata.org/wiki/Q128581"
  ]);
  const serialized = deserialized.serialize(true);

  expect(serialized).toStrictEqual(dto);
});
