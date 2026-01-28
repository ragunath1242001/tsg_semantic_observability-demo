import { expect, test } from "vitest";

import { defaultContext } from "../../../jsonld/context.defaults.js";
import { deserialize } from "../../deserialize.js";
import { Multilanguage } from "../common.js";
import {
  TransferCompletionMessageDto,
  TransferErrorDto,
  TransferProcessDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "./messages.dto.js";
import {
  DataAddress,
  EndpointProperty,
  TransferCompletionMessage,
  TransferError,
  TransferProcess,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage
} from "./messages.js";

test("Transfer Completion Message", async () => {
  const transferCompletionMessage = new TransferCompletionMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3"
  });
  const serialized = transferCompletionMessage.serialize();
  const expected: TransferCompletionMessageDto = {
    "@context": defaultContext(),
    "@type": "TransferCompletionMessage",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3"
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferCompletionMessage>(serialized);
  expect(deserialized).toStrictEqual(transferCompletionMessage);
});

test("Transfer Error", async () => {
  const transferError = new TransferError({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    code: "123:A",
    reason: [new Multilanguage("Could not transfer")]
  });
  const serialized = transferError.serialize();
  const expected: TransferErrorDto = {
    "@context": defaultContext(),
    "@type": "TransferError",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    code: "123:A",
    reason: [
      {
        "@value": "Could not transfer",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferError>(serialized);
  expect(deserialized).toStrictEqual(transferError);
});

test("Transfer Process", async () => {
  const transferProcess = new TransferProcess({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    state: TransferState.SUSPENDED
  });
  const serialized = transferProcess.serialize();
  const expected: TransferProcessDto = {
    "@context": defaultContext(),
    "@type": "TransferProcess",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    state: TransferState.SUSPENDED
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferProcess>(serialized);
  expect(deserialized).toStrictEqual(transferProcess);
});

test("Transfer Request Message", async () => {
  const transferRequestMessage = new TransferRequestMessage({
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    agreementId: "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    format: "HTTP",
    callbackAddress: "http://localhost",
    dataAddress: new DataAddress({
      endpointType: "HTTP",
      endpoint: "http://example.com",
      endpointProperties: [
        new EndpointProperty({
          name: "Authorization",
          value: "Bearer TOKEN-ABCDEFG"
        })
      ]
    })
  });
  const serialized = transferRequestMessage.serialize();
  const expected: TransferRequestMessageDto = {
    "@context": defaultContext(),
    "@type": "TransferRequestMessage",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    agreementId: "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    format: "HTTP",
    callbackAddress: "http://localhost",
    dataAddress: {
      "@type": "DataAddress",
      endpointType: "HTTP",
      endpoint: "http://example.com",
      endpointProperties: [
        {
          "@type": "EndpointProperty",
          name: "Authorization",
          value: "Bearer TOKEN-ABCDEFG"
        }
      ]
    }
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferRequestMessage>(serialized);
  expect(deserialized).toStrictEqual(transferRequestMessage);
});

test("Transfer Start Message", async () => {
  const transferStartMessage = new TransferStartMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    dataAddress: new DataAddress({
      endpointType: "HTTP",
      endpoint: "http://example.com",
      endpointProperties: [
        new EndpointProperty({
          name: "Authorization",
          value: "Bearer TOKEN-ABCDEFG"
        })
      ]
    })
  });
  const serialized = transferStartMessage.serialize();
  const expected: TransferStartMessageDto = {
    "@context": defaultContext(),
    "@type": "TransferStartMessage",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    dataAddress: {
      "@type": "DataAddress",
      endpointType: "HTTP",
      endpoint: "http://example.com",
      endpointProperties: [
        {
          "@type": "EndpointProperty",
          name: "Authorization",
          value: "Bearer TOKEN-ABCDEFG"
        }
      ]
    }
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferStartMessage>(serialized);
  expect(deserialized).toStrictEqual(transferStartMessage);
});

test("Transfer Suspension Message", async () => {
  const transferSuspensionMessage = new TransferSuspensionMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    reason: [new Multilanguage("Network switching")]
  });
  const serialized = transferSuspensionMessage.serialize();
  const expected: TransferSuspensionMessageDto = {
    "@context": defaultContext(),
    "@type": "TransferSuspensionMessage",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    reason: [
      {
        "@value": "Network switching",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferSuspensionMessage>(serialized);
  expect(deserialized).toStrictEqual(transferSuspensionMessage);
});

test("Transfer Termination Message", async () => {
  const transferTerminationMessage = new TransferTerminationMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    code: "123:A",
    reason: [new Multilanguage("Network switching")]
  });
  const serialized = transferTerminationMessage.serialize();
  const expected: TransferTerminationMessageDto = {
    "@context": defaultContext(),
    "@type": "TransferTerminationMessage",
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    code: "123:A",
    reason: [
      {
        "@value": "Network switching",
        "@language": "en"
      }
    ]
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized =
    await deserialize<TransferTerminationMessage>(serialized);
  expect(deserialized).toStrictEqual(transferTerminationMessage);
});
