import { deserialize } from "../../serialize";
import { Multilanguage } from "../common";
import { Catalog } from "./catalog";
import { CatalogError, CatalogMessage, CatalogRequestMessage, DatasetRequestMessage, ICatalogRequestMessage } from "./messages";

test("Catalog Error", () => {
  const catalogError = new CatalogError({
    code: "123:A",
    reason: [
      new Multilanguage({
        value: "Catalog not provisioned for this requester.",
        language: "en",
      }),
    ],
  });
  const catalogErrorSerialized = catalogError.serialize();
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
  expect(deserialize<CatalogError>(catalogErrorJsonLD)).toStrictEqual(
    catalogError
  );
});

test("Catalog Message", () => {
  const catalogMessage = new CatalogMessage({
    catalog: [new Catalog({
      id: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
    })],
  });
  const catalogMessageSerialized = catalogMessage.serialize();
  const catalogMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:CatalogMessage",
    "dspace:catalog": [{
      "@type": "dcat:Catalog",
      "@id": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
    }]
  };
  expect(catalogMessageSerialized).toStrictEqual(catalogMessageJsonLD);
  expect(deserialize<CatalogMessage>(catalogMessageJsonLD)).toStrictEqual(
    catalogMessage
  );
});

test("Catalog Request Message", () => {
  const catalogRequestMessage = new CatalogRequestMessage({
    filter: [{
      '@type': 'dspace:Filter',
      'SPARQL': 'DESCRIBE * WHERE {?s ?p ?o.}'
    }],
  });
  const catalogRequestMessageSerialized = catalogRequestMessage.serialize();
  const catalogRequestMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:CatalogRequestMessage",
    "dspace:filter": [{
      "@type": "dspace:Filter",
      "SPARQL": "DESCRIBE * WHERE {?s ?p ?o.}"
    }]
  };
  expect(catalogRequestMessageSerialized).toStrictEqual(catalogRequestMessageJsonLD);
  expect(deserialize<CatalogRequestMessage>(catalogRequestMessageJsonLD)).toStrictEqual(
    catalogRequestMessage
  );
});


test("Dataset Request Message", () => {
  const datasetRequestMessage = new DatasetRequestMessage({
    dataset: "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2",
  });
  const datasetRequestMessageSerialized = datasetRequestMessage.serialize();
  const datasetRequestMessageJsonLD = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:DatasetRequestMessage",
    "dspace:dataset": "urn:uuid:5b156cfa-5800-4345-8acc-6725c7eb5bc2"
  };
  expect(datasetRequestMessageSerialized).toStrictEqual(datasetRequestMessageJsonLD);
  expect(deserialize<DatasetRequestMessage>(datasetRequestMessageJsonLD)).toStrictEqual(
    datasetRequestMessage
  );
});

