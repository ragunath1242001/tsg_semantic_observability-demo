import { deserialize } from "../../serialize";
import { Multilanguage, Reference } from "../common";
import { Offer } from "../negotiation/negotiation";
import { Resource } from "./catalog";
import { ResourceDto } from "@tsg-dsp/common";

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

// TODO: deserialization samples
