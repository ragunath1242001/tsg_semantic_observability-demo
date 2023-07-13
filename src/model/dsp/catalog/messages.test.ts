import { deserialize } from "../../serialize";
import { Multilanguage } from "../common";
import { Catalog } from "./catalog";
import { CatalogError, CatalogMessage, CatalogRequestMessage, DatasetRequestMessage, ICatalogRequestMessage } from "./messages";

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
  const catalogErrorSerialized = await catalogError.serialize();
  const catalogErrorJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:CatalogError",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Catalog not provisioned for this requester.",
        "@language": "en",
      },
    ],
  };
  expect(catalogErrorSerialized).toStrictEqual(catalogErrorJsonLD);
  const deserialized = await deserialize<CatalogError>(catalogErrorJsonLD)
  expect(deserialized).toStrictEqual(
    catalogError
  );
});

test("Catalog Message", async () => {
  const catalogMessage = new CatalogMessage({
    catalog: [new Catalog({
      id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
    })],
  });
  const catalogMessageSerialized = await catalogMessage.serialize();
  const catalogMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:CatalogMessage",
    "dspace:catalog": [{
      "@type": "dcat:Catalog",
      "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
    }]
  };
  expect(catalogMessageSerialized).toStrictEqual(catalogMessageJsonLD);
  expect(await deserialize<CatalogMessage>(catalogMessageJsonLD)).toStrictEqual(
    catalogMessage
  );
});

test("Catalog Request Message", async () => {
  const catalogRequestMessage = new CatalogRequestMessage({
    filter: [{
      '@type': 'dspace:Filter',
      'dspace:SPARQL': 'DESCRIBE * WHERE {?s ?p ?o.}'
    }],
  });
  const catalogRequestMessageSerialized = await catalogRequestMessage.serialize();
  const catalogRequestMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:CatalogRequestMessage",
    "dspace:filter": [{
      "@type": "dspace:Filter",
      "dspace:SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}"
    }]
  };
  expect(catalogRequestMessageSerialized).toStrictEqual(catalogRequestMessageJsonLD);
  const deserialized = await deserialize<CatalogRequestMessage>(catalogRequestMessageJsonLD)
  expect(deserialized).toStrictEqual(
    catalogRequestMessage
  );
});


test("Dataset Request Message", async () => {
  const datasetRequestMessage = new DatasetRequestMessage({
    dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
  });
  const datasetRequestMessageSerialized = await datasetRequestMessage.serialize();
  const datasetRequestMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:DatasetRequestMessage",
    "dspace:dataset": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
  };
  expect(datasetRequestMessageSerialized).toStrictEqual(datasetRequestMessageJsonLD);
  expect(await deserialize<DatasetRequestMessage>(datasetRequestMessageJsonLD)).toStrictEqual(
    datasetRequestMessage
  );
});

