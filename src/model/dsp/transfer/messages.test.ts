import { deserialize } from "../../serialize";
import { ClassValidationError, Multilanguage, URI } from "../common";
import {
  TransferCompletionMessage,
  TransferError,
  TransferProcess,
  TransferRequestMessage,
  TransferStartMessage,
  TransferState,
  TransferSuspensionMessage,
  TransferTerminationMessage,
} from "./messages";

test("Validation", async () => {
  const jsonLd = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferCompletionMessage",
    "dspace:processId": "",
  }
  expect(async () => {
    return await deserialize<TransferCompletionMessage>(jsonLd)
  }).rejects.toThrowError(ClassValidationError)
})

test("Transfer Completion Message", async () => {
  const transferCompletionMessage = new TransferCompletionMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
  });
  const serialized = await transferCompletionMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferCompletionMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
  });
  expect(await deserialize<TransferCompletionMessage>(serialized)).toStrictEqual(
    transferCompletionMessage
  );
});

test("Transfer Error", async () => {
  const transferError = new TransferError({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    code: "123:A",
    reason: [
      new Multilanguage({
        value: "Could not transfer",
        language: "en",
      }),
    ],
  });
  const serialized = await transferError.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferError",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Could not transfer",
        "@language": "en",
      },
    ],
  });
  expect(await deserialize<TransferError>(serialized)).toStrictEqual(transferError);
});

test("Transfer Process", async () => {
  const transferProcess = new TransferProcess({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    transferState: TransferState.SUSPENDED,
  });
  const serialized = await transferProcess.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferProcess",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:transferState": "dspace:SUSPENDED",
  });
  expect(await deserialize<TransferProcess>(serialized)).toStrictEqual(
    transferProcess
  );
});

test("Transfer Request Message", async () => {
  const transferRequestMessage = new TransferRequestMessage({
    agreementId: "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    format: "dspace:HTTP",
    dataAddress: new URI("http://example.com"),
  });
  const serialized = await transferRequestMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferRequestMessage",
    "dspace:agreementId": "urn:uuid:1246a1af-6e5f-4c05-86e2-6d8624efeeb3",
    "dct:format": "dspace:HTTP",
    "dspace:dataAddress": {
      "@type": "xsd:anyURI",
      "@value": "http://example.com",
    },
  });
  expect(await deserialize<TransferRequestMessage>(serialized)).toStrictEqual(
    transferRequestMessage
  );
});

test("Transfer Start Message", async () => {
  const transferStartMessage = new TransferStartMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    dataAddress: new URI("http://example.com"),
  });
  const serialized = await transferStartMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferStartMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:dataAddress": {
      "@type": "xsd:anyURI",
      "@value": "http://example.com",
    },
  });
  expect(await deserialize<TransferStartMessage>(serialized)).toStrictEqual(
    transferStartMessage
  );
});

test("Transfer Suspension Message", async () => {
  const transferSuspensionMessage = new TransferSuspensionMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    reason: [
      new Multilanguage({
        value: "Network switching",
        language: "en",
      }),
    ],
  });
  const serialized = await transferSuspensionMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferSuspensionMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:reason": [
      {
        "@value": "Network switching",
        "@language": "en",
      },
    ],
  });
  expect(await deserialize<TransferSuspensionMessage>(serialized)).toStrictEqual(
    transferSuspensionMessage
  );
});


test("Transfer Termination Message", async () => {
  const transferTerminationMessage = new TransferTerminationMessage({
    processId: "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    code: "123:A",
    reason: [
      new Multilanguage({
        value: "Network switching",
        language: "en",
      }),
    ],
  });
  const serialized = await transferTerminationMessage.serialize();
  expect(serialized).toStrictEqual({
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferTerminationMessage",
    "dspace:processId": "urn:uuid:42f9f234-0aa7-4fba-9efd-01b4a942f052",
    "dspace:code": "123:A",
    "dspace:reason": [
      {
        "@value": "Network switching",
        "@language": "en",
      },
    ],
  });
  expect(await deserialize<TransferTerminationMessage>(serialized)).toStrictEqual(
    transferTerminationMessage
  );
});