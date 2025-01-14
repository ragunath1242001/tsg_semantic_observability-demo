import { deserialize } from "../../deserialize.js";
import { Multilanguage } from "../common.js";
import {
  ContractAgreementMessage,
  ContractAgreementVerificationMessage,
  ContractNegotiation,
  ContractNegotiationError,
  ContractNegotiationEventMessage,
  ContractNegotiationTerminationMessage,
  ContractOfferMessage,
  ContractRequestMessage
} from "./messages.js";
import { Agreement, Offer } from "./negotiation.js";
import {
  ContractRequestMessageDto,
  ContractOfferMessageDto,
  ContractNegotiationTerminationMessageDto,
  ContractNegotiationState,
  ContractNegotiationDto,
  NegotiationEvent,
  ContractNegotiationEventMessageDto,
  ContractNegotiationErrorDto,
  ContractAgreementVerificationMessageDto,
  ContractAgreementMessageDto
} from "./messages.dto.js";
import { expect, test } from "@jest/globals";
import { defaultContext } from "../../../jsonld/context.defaults.js";

test("Contract Request Message", async () => {
  const contractRequestMessage = new ContractRequestMessage({
    consumerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    offer: new Offer({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      target: "urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
    }),
    callbackAddress: "http://example.com"
  });
  const serialized = await contractRequestMessage.serialize();
  const expected: ContractRequestMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractRequestMessage",
    "dspace:consumerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      "odrl:target": "urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
    },
    "dspace:callbackAddress": "http://example.com"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractRequestMessage>(serialized);
  expect(deserialized).toStrictEqual(contractRequestMessage);
});

test("Contract Offer Message", async () => {
  const contractOfferMessage = new ContractOfferMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    offer: new Offer({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f"
    }),
    callbackAddress: "http://example.com"
  });
  const serialized = await contractOfferMessage.serialize();
  const expected: ContractOfferMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractOfferMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:offer": {
      "@type": "odrl:Offer",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f"
    },
    "dspace:callbackAddress": "http://example.com"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractOfferMessage>(serialized);
  expect(deserialized).toStrictEqual(contractOfferMessage);
});

test("Contract Negotiation Termination Message", async () => {
  const contractNegotiationTerminationMessage =
    new ContractNegotiationTerminationMessage({
      providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
      consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
      code: "123:A",
      reason: [new Multilanguage("Could not proceed with negotiation")]
    });
  const serialized = await contractNegotiationTerminationMessage.serialize();
  const expected: ContractNegotiationTerminationMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractNegotiationTerminationMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Could not proceed with negotiation",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized =
    await deserialize<ContractNegotiationTerminationMessage>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationTerminationMessage);
});

test("Contract Negotiation", async () => {
  const contractNegotiation = new ContractNegotiation({
    id: "urn:uuid:448790ed-f829-4994-b148-f2114d1f3a82",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    state: ContractNegotiationState.REQUESTED
  });
  const serialized = await contractNegotiation.serialize();
  const expected: ContractNegotiationDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractNegotiation",
    "@id": "urn:uuid:448790ed-f829-4994-b148-f2114d1f3a82",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dspace:state": ContractNegotiationState.REQUESTED
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiation>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiation);
});

test("Contract Negotiation Event Message", async () => {
  const contractNegotiationEventMessage = new ContractNegotiationEventMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    eventType: NegotiationEvent.ACCEPTED
  });
  const serialized = await contractNegotiationEventMessage.serialize();
  const expected: ContractNegotiationEventMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractNegotiationEventMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dspace:eventType": NegotiationEvent.ACCEPTED
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized =
    await deserialize<ContractNegotiationEventMessage>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationEventMessage);
});

test("Contract Negotiation Error", async () => {
  const contractNegotiationError = new ContractNegotiationError({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    description: [new Multilanguage("123:A")],
    reason: [new Multilanguage("Could not proceed with negotiation")]
  });
  const serialized = await contractNegotiationError.serialize();
  const expected: ContractNegotiationErrorDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractNegotiationError",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dct:description": [{ "@language": "en", "@value": "123:A" }],
    "dspace:reason": [
      {
        "@value": "Could not proceed with negotiation",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractNegotiationError>(serialized);
  expect(deserialized).toStrictEqual(contractNegotiationError);
});

test("Contract AgreementVerification Message", async () => {
  const contractAgreementVerificationMessage =
    new ContractAgreementVerificationMessage({
      providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
      consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
      hashedMessage: {
        "dspace:algorithm": "ALG",
        "dspace:digest": "DIGEST"
      }
    });
  const serialized = await contractAgreementVerificationMessage.serialize();
  const expected: ContractAgreementVerificationMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractAgreementVerificationMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dspace:hashedMessage": {
      "dspace:algorithm": "ALG",
      "dspace:digest": "DIGEST"
    }
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized =
    await deserialize<ContractAgreementVerificationMessage>(serialized);
  expect(deserialized).toStrictEqual(contractAgreementVerificationMessage);
});

test("Contract Agreement Message", async () => {
  const contractAgreementMessage = new ContractAgreementMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    agreement: new Agreement({
      id: "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      assigner: "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      assignee: "urn:uuid:86ba9a67-5501-49b5-aba7-f81a8c3b5935",
      timestamp: "2023-07-12T15:26:00Z",
      target: "urn:uuid:urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
    })
  });
  const serialized = await contractAgreementMessage.serialize();
  const expected: ContractAgreementMessageDto = {
    "@context": defaultContext(),
    "@type": "dspace:ContractAgreementMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:0a66a76e-70c9-4c0c-b70d-06e3a0047a9c",
    "dspace:agreement": {
      "@type": "odrl:Agreement",
      "@id": "urn:uuid:506f0e00-67ad-4b53-b9b6-5f2580b533c0",
      "odrl:assigner": "urn:uuid:ef0ab3f8-15c9-4612-a5c3-7c574155e86f",
      "odrl:assignee": "urn:uuid:86ba9a67-5501-49b5-aba7-f81a8c3b5935",
      "dspace:timestamp": "2023-07-12T15:26:00Z",
      "odrl:target": "urn:uuid:urn:uuid:3058a24a-2805-4f00-9276-c4f2234c7117"
    }
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<ContractAgreementMessage>(serialized);
  expect(deserialized).toStrictEqual(contractAgreementMessage);
});
