import { expect, test } from "@jest/globals";

import { defaultContext } from "../../../jsonld/context.defaults.js";
import { deserialize } from "../../deserialize.js";
import { Multilanguage } from "../common.js";
import {
  CatalogErrorDto,
  CatalogRequestMessageDto,
  DatasetRequestMessageDto
} from "./messages.dto.js";
import {
  CatalogError,
  CatalogRequestMessage,
  DatasetRequestMessage
} from "./messages.js";

test("Catalog Error", async () => {
  const catalogError = new CatalogError({
    code: "123:A",
    reason: [
      new Multilanguage({
        value: "Catalog not provisioned for this requester.",
        language: "en"
      })
    ]
  });
  const serialized = catalogError.serialize();
  const expected: CatalogErrorDto = {
    "@context": defaultContext(),
    "@type": "CatalogError",
    code: "123:A",
    reason: [
      {
        "@value": "Catalog not provisioned for this requester.",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<CatalogError>(expected);
  expect(deserialized).toStrictEqual(catalogError);
});

test("Catalog Request Message", async () => {
  const catalogRequestMessage = new CatalogRequestMessage({
    filter: [
      {
        "@type": "Filter",
        "tsg:SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}"
      }
    ]
  });
  const serialized = catalogRequestMessage.serialize();
  const expected: CatalogRequestMessageDto = {
    "@context": defaultContext(),
    "@type": "CatalogRequestMessage",
    filter: [
      {
        "@type": "Filter",
        "tsg:SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<CatalogRequestMessage>(expected);
  expect(deserialized).toStrictEqual(catalogRequestMessage);
});

test("Dataset Request Message", async () => {
  const datasetRequestMessage = new DatasetRequestMessage({
    dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
  });
  const serialized = datasetRequestMessage.serialize();
  const expected: DatasetRequestMessageDto = {
    "@context": defaultContext(),
    "@type": "DatasetRequestMessage",
    dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<DatasetRequestMessage>(expected);
  expect(deserialized).toStrictEqual(datasetRequestMessage);
});
