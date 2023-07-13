import { deserialize } from "../../serialize"
import { Multilanguage, Reference, Time } from "../common"
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationError, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "./messages"
import { NegotiationEvent, ProofTypes } from "./messages.schema"
import { Agreement, Offer } from "./negotiation"


test("Contract Request Message", async () => {
  const contractRequestMessage = new ContractRequestMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    offer: new Offer({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f"
    }),
    callbackAddress: "http://example.com"
  })
  const serialized = await contractRequestMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractRequestMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "odrl:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
    },
    "dspace:callbackAddress": "http://example.com",
  });
  expect(await deserialize<ContractRequestMessage>(serialized)).toStrictEqual(contractRequestMessage)
})


test("Contract Offer Message", async () => {
  const contractOfferMessage = new ContractOfferMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    offer: new Offer({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f"
    }),
    callbackAddress: "http://example.com"
  })
  const serialized = await contractOfferMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractOfferMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "odrl:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
    },
    "dspace:callbackAddress": "http://example.com",
  });
  expect(await deserialize<ContractOfferMessage>(serialized)).toStrictEqual(contractOfferMessage)
})

test("Contract Negotiation Termination Message", async () => {
  const contractNegotiationTerminationMessage = new ContractNegotiationTerminationMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    code: "123:A",
    reason: [new Multilanguage({
      value: "Could not proceed with negotiation",
      language: "en"
    })]
  })
  const serialized = await contractNegotiationTerminationMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiationTerminationMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Could not proceed with negotiation",
        "@language": "en"
      }
    ]
  });
  expect(await deserialize<ContractNegotiationTerminationMessage>(serialized)).toStrictEqual(contractNegotiationTerminationMessage)
})



test("Contract Negotiation", async () => {
  const contractNegotiation = new ContractNegotiation({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    negotiationId: "urn:uuid:f635f0d2-e4dd-4b87-8a7f-5765954303c5"
  })
  const serialized = await contractNegotiation.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiation",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:negotiationId": "urn:uuid:f635f0d2-e4dd-4b87-8a7f-5765954303c5",
  });
  expect(await deserialize<ContractNegotiation>(serialized)).toStrictEqual(contractNegotiation)
})

test("Contract Negotiation Event Message", async () => {
  const contractNegotiationEventMessage = new ContractNegotiationEventMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    eventType: NegotiationEvent.ACCEPTED
  })
  const serialized = await contractNegotiationEventMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiationEventMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:eventType": "dspace:ACCEPTED",
  });
  expect(await deserialize<ContractNegotiationEventMessage>(serialized)).toStrictEqual(contractNegotiationEventMessage)
})

test("Contract Negotiation Error", async () => {
  const contractNegotiationError = new ContractNegotiationError({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    description: ["123:A"],
    reason: [new Multilanguage({
      value: "Could not proceed with negotiation",
      language: "en"
    })]
  })
  const serialized = await contractNegotiationError.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiationError",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dct:description": ["123:A"],
    "dspace:reason": [
      {
        "@value": "Could not proceed with negotiation",
        "@language": "en"
      }
    ]
  });
  expect(await deserialize<ContractNegotiationError>(serialized)).toStrictEqual(contractNegotiationError)
})


test("Contract AgreementVerification Message", async () => {
  const contractAgreementVerificationMessage = new ContractAgreementVerificationMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    credentialSubject: {
      "dspace:hash": "0e3e75234abc68f4378a86b3f4b32a198ba301845b0cd6e50106e874345700cc6663a86c1ea125dc5e92be17c98f9a0f85ca9d5f595db2012f7cc3571945c123"
    },
    proof: {
      "@type": ProofTypes.Ed25519Signature2020,
      "dct:created": "2023-07-12T15:26:00Z",
      "sec:jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8YIj2tG6HoiDKw476_ElxcCFiCTr89jHX24Osr1zgklp0Sgfkgx-ipu6Li5og4wtLGMoa7__xJpcHWHzwWZoCQ"
    }
  })
  const serialized = await contractAgreementVerificationMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractAgreementVerificationMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "cred:credentialSubject": {
      "dspace:hash": "0e3e75234abc68f4378a86b3f4b32a198ba301845b0cd6e50106e874345700cc6663a86c1ea125dc5e92be17c98f9a0f85ca9d5f595db2012f7cc3571945c123",
    },
    "sec:proof": {
      "@type": "sec:Ed25519Signature2020",
      "dct:created": "2023-07-12T15:26:00Z",
      "sec:jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8YIj2tG6HoiDKw476_ElxcCFiCTr89jHX24Osr1zgklp0Sgfkgx-ipu6Li5og4wtLGMoa7__xJpcHWHzwWZoCQ",
    },
  });
  const deserialized = await deserialize<ContractAgreementVerificationMessage>(serialized);
  expect(deserialized).toStrictEqual(contractAgreementVerificationMessage)
})


test("Contract Agreement Message", async () => {
  const contractAgreementMessage = new ContractAgreementMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    agreement: new Agreement({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      assignee: "urn:uuid:86ba9a67-5501-49b5-aba7-f81a8c3b5935",
      timestamp: "2023-07-12T15:26:00Z",
      consumerId: "Consumer A",
      providerId: "Provider 1"
    })
  })
  const serialized = await contractAgreementMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractAgreementMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "odrl:agreement": {
      "@type": "odrl:Agreement",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      "odrl:assignee": "urn:uuid:86ba9a67-5501-49b5-aba7-f81a8c3b5935",
      "dspace:timestamp": "2023-07-12T15:26:00Z",
      "dspace:consumerId": "Consumer A",
      "dspace:providerId": "Provider 1",
    },
  });
  expect(await deserialize<ContractAgreementMessage>(serialized)).toStrictEqual(contractAgreementMessage)
})