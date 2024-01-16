import { deserialize } from "../../serialize"
import { Multilanguage } from "../common"
import { ContractAgreementMessage, ContractAgreementVerificationMessage, ContractNegotiation, ContractNegotiationError, ContractNegotiationEventMessage, ContractNegotiationTerminationMessage, ContractOfferMessage, ContractRequestMessage } from "./messages"
import { ContractNegotiationState, ContractAgreementMessageDto, ContractAgreementVerificationMessageDto, ContractNegotiationDto, ContractNegotiationErrorDto, ContractNegotiationEventMessageDto, ContractNegotiationTerminationMessageDto, ContractOfferMessageDto, ContractRequestMessageDto, NegotiationEvent, ProofTypes } from "./messages.dto"
import { Agreement, Offer } from "./negotiation"


test("Contract Request Message", async () => {
  const contractRequestMessage = new ContractRequestMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    offer: new Offer({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f"
    }),
    callbackAddress: "http://example.com",
    dataSet: "urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
  })
  const serialized = await contractRequestMessage.serialize();
  const expected: ContractRequestMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractRequestMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
    },
    "dspace:callbackAddress": "http://example.com",
    "dspace:dataSet": "urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractRequestMessage>(serialized);
  expect(deserialized).toStrictEqual(contractRequestMessage)
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
  const expected: ContractOfferMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractOfferMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
    },
    "dspace:callbackAddress": "http://example.com",
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractOfferMessage>(serialized);
  expect(deserialized).toStrictEqual(contractOfferMessage)
})

test("Contract Negotiation Termination Message", async () => {
  const contractNegotiationTerminationMessage = new ContractNegotiationTerminationMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    code: "123:A",
    reason: [new Multilanguage("Could not proceed with negotiation")]
  })
  const serialized = await contractNegotiationTerminationMessage.serialize();
  const expected: ContractNegotiationTerminationMessageDto = {
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
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiationTerminationMessage>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationTerminationMessage)
})



test("Contract Negotiation", async () => {
  const contractNegotiation = new ContractNegotiation({
    id: "urn:uuid:448790ed-f829-4994-b148-f2114d1f3a82",
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    contractNegotiationState: ContractNegotiationState.REQUESTED
  })
  const serialized = await contractNegotiation.serialize();
  const expected: ContractNegotiationDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiation",
    "@id": "urn:uuid:448790ed-f829-4994-b148-f2114d1f3a82",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:contractNegotiationState": ContractNegotiationState.REQUESTED
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiation>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiation)
})

test("Contract Negotiation Event Message", async () => {
  const contractNegotiationEventMessage = new ContractNegotiationEventMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    eventType: NegotiationEvent.ACCEPTED
  })
  const serialized = await contractNegotiationEventMessage.serialize();
  const expected: ContractNegotiationEventMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractNegotiationEventMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:eventType": NegotiationEvent.ACCEPTED,
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiationEventMessage>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationEventMessage)
})

test("Contract Negotiation Error", async () => {
  const contractNegotiationError = new ContractNegotiationError({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    description: ["123:A"],
    reason: [new Multilanguage("Could not proceed with negotiation")]
  })
  const serialized = await contractNegotiationError.serialize();
  const expected: ContractNegotiationErrorDto = {
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
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiationError>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationError)
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
  const expected: ContractAgreementVerificationMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractAgreementVerificationMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "cred:credentialSubject": {
      "dspace:hash": "0e3e75234abc68f4378a86b3f4b32a198ba301845b0cd6e50106e874345700cc6663a86c1ea125dc5e92be17c98f9a0f85ca9d5f595db2012f7cc3571945c123",
    },
    "sec:proof": {
      "@type": ProofTypes.Ed25519Signature2020,
      "dct:created": "2023-07-12T15:26:00Z",
      "sec:jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8YIj2tG6HoiDKw476_ElxcCFiCTr89jHX24Osr1zgklp0Sgfkgx-ipu6Li5og4wtLGMoa7__xJpcHWHzwWZoCQ",
    },
  }
  expect(serialized).toStrictEqual(expected);
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
  const expected: ContractAgreementMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:ContractAgreementMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:agreement": {
      "@type": "odrl:Agreement",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      "odrl:assignee": "urn:uuid:86ba9a67-5501-49b5-aba7-f81a8c3b5935",
      "dspace:timestamp": "2023-07-12T15:26:00Z",
      "dspace:consumerId": "Consumer A",
      "dspace:providerId": "Provider 1",
    },
  }
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractAgreementMessage>(serialized);
  expect(deserialized).toStrictEqual(contractAgreementMessage)
})