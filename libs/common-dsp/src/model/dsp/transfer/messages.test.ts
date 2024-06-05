import { deserialize } from "../../serialize";
import { Multilanguage, URI } from "../common";
import {
  DataAddress,
  EndpointProperty,
  TransferCompletionMessage,
  TransferError,
  TransferProcess,
  TransferRequestMessage,
  TransferStartMessage,
  TransferSuspensionMessage,
  TransferTerminationMessage,
} from "./messages";
import { TransferCompletionMessageDto, TransferErrorDto, TransferState, TransferProcessDto, TransferRequestMessageDto, TransferStartMessageDto, TransferSuspensionMessageDto, TransferTerminationMessageDto } from "./messages.dto";

import {expect, test} from '@jest/globals';

test("Transfer Completion Message", async () => {
  const transferCompletionMessage = new TransferCompletionMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
  });
  const serialized = await transferCompletionMessage.serialize();
  const expected: TransferCompletionMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferCompletionMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
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
    reason: [new Multilanguage("Could not transfer")],
  });
  const serialized = await transferError.serialize();
  const expected: TransferErrorDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferError",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Could not transfer",
        "@language": "en",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferError>(serialized);
  expect(deserialized).toStrictEqual(transferError);
});

test("Transfer Process", async () => {
  const transferProcess = new TransferProcess({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    state: TransferState.SUSPENDED,
    agreementId: "urn:uuid:b5c1ac04-620f-470a-a841-df11d14e5268",
  });
  const serialized = await transferProcess.serialize();
  const expected: TransferProcessDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferProcess",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:state": TransferState.SUSPENDED,
    "dspace:agreementId": "urn:uuid:b5c1ac04-620f-470a-a841-df11d14e5268",
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferProcess>(serialized);
  expect(deserialized).toStrictEqual(transferProcess);
});

test("Transfer Request Message", async () => {
  const transferRequestMessage = new TransferRequestMessage({
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    agreementId: "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    format: "dspace:HTTP",
    callbackAddress: "http://localhost",
    dataAddress: new DataAddress({
      endpointType: "HTTP",
      endpoint: "http://example.com",
      endpointProperties: [
        new EndpointProperty({
          name: "Authorization",
          value: "Bearer TOKEN-ABCDEFG",
        }),
      ],
    }),
  });
  const serialized = await transferRequestMessage.serialize();
  const expected: TransferRequestMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferRequestMessage",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:agreementId": "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    "dct:format": "dspace:HTTP",
    "dspace:callbackAddress": "http://localhost",
    "dspace:dataAddress": {
      "@type": "dspace:DataAddress",
      "dspace:endpointType": "HTTP",
      "dspace:endpoint": "http://example.com",
      "dspace:endpointProperties": [
        {
          "@type": "dspace:EndpointProperty",
          "dspace:name": "Authorization",
          "dspace:value": "Bearer TOKEN-ABCDEFG",
        },
      ],
    },
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
          value: "Bearer TOKEN-ABCDEFG",
        }),
      ],
    }),
  });
  const serialized = await transferStartMessage.serialize();
  const expected: TransferStartMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferStartMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:dataAddress": {
      "@type": "dspace:DataAddress",
      "dspace:endpointType": "HTTP",
      "dspace:endpoint": "http://example.com",
      "dspace:endpointProperties": [
        {
          "@type": "dspace:EndpointProperty",
          "dspace:name": "Authorization",
          "dspace:value": "Bearer TOKEN-ABCDEFG",
        },
      ],
    },
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferStartMessage>(serialized);
  expect(deserialized).toStrictEqual(transferStartMessage);
});

test("Transfer Suspension Message", async () => {
  const transferSuspensionMessage = new TransferSuspensionMessage({
    providerPid: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    consumerPid: "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    reason: [new Multilanguage("Network switching")],
  });
  const serialized = await transferSuspensionMessage.serialize();
  const expected: TransferSuspensionMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferSuspensionMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:reason": [
      {
        "@value": "Network switching",
        "@language": "en",
      },
    ],
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
    reason: [new Multilanguage("Network switching")],
  });
  const serialized = await transferTerminationMessage.serialize();
  const expected: TransferTerminationMessageDto = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferTerminationMessage",
    "dspace:providerPid": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:consumerPid": "urn:uuid:89442cfb-4d96-48fa-80d1-d7cf93bd34a3",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Network switching",
        "@language": "en",
      },
    ],
  };
  expect(serialized).toStrictEqual(expected);
  const deserialized = await deserialize<TransferTerminationMessage>(
    serialized
  );
  expect(deserialized).toStrictEqual(transferTerminationMessage);
});
