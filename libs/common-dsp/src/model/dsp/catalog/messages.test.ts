import { deserialize } from "../../serialize";
import { Multilanguage } from "../common";
import { Catalog } from "./catalog";
import {
  CatalogErrorDto,
  CatalogMessageDto,
  CatalogRequestMessageDto,
  DatasetRequestMessageDto,
} from "./messages.dto";
import {
  CatalogError,
  CatalogMessage,
  CatalogRequestMessage,
  DatasetRequestMessage,
} from "./messages";
import { expect, test } from "@jest/globals";

test("Catalog Error", async () => {
  const catalogError = new CatalogError({
    code: "123:A",
    reason: [
      new Multilanguage({
        value: "Catalog not provisioned for this requester.",
        language: "en",
      }),
    ],
  });
  const serialized = await catalogError.serialize();
  const expected: CatalogErrorDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dspace:CatalogError",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Catalog not provisioned for this requester.",
        "@language": "en",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<CatalogError>(expected);
  expect(deserialized).toStrictEqual(catalogError);
});

test("Catalog Message", async () => {
  const catalogMessage = new CatalogMessage({
    catalog: [
      new Catalog({
        id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
      }),
    ],
  });
  const serialized = await catalogMessage.serialize();
  const expected: CatalogMessageDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dspace:CatalogMessage",
    "dspace:catalog": [
      {
        "@type": "dcat:Catalog",
        "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<CatalogMessage>(expected);
  expect(deserialized).toStrictEqual(catalogMessage);
});

test("Catalog Request Message", async () => {
  const catalogRequestMessage = new CatalogRequestMessage({
    filter: [
      {
        "@type": "dspace:Filter",
        "dspace:SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}",
      },
    ],
  });
  const serialized = await catalogRequestMessage.serialize();
  const expected: CatalogRequestMessageDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dspace:CatalogRequestMessage",
    "dspace:filter": [
      {
        "@type": "dspace:Filter",
        "dspace:SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<CatalogRequestMessage>(expected);
  expect(deserialized).toStrictEqual(catalogRequestMessage);
});

test("Dataset Request Message", async () => {
  const datasetRequestMessage = new DatasetRequestMessage({
    dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
  });
  const serialized = await datasetRequestMessage.serialize();
  const expected: DatasetRequestMessageDto = {
    "@context": "https://w3id.org/dspace/2024/1/context.json",
    "@type": "dspace:DatasetRequestMessage",
    "dspace:dataset": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<DatasetRequestMessage>(expected);
  expect(deserialized).toStrictEqual(datasetRequestMessage);
});
