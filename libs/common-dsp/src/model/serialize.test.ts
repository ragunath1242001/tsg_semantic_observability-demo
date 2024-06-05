import { serializableTypes } from "./decorators";
import { ClassValidationError } from "./dsp/common";
import { TransferCompletionMessage } from "./dsp/transfer/messages";
import { deserialize } from "./serialize";
import {expect, test} from '@jest/globals';

test("Validation", async () => {
  const jsonLd = {
    "@context": "https://w3id.org/dspace/v0.8/context.json",
    "@type": "dspace:TransferCompletionMessage",
    "dspace:processId": "",
  };
  expect(async () => {
    // TODO: Fix unitialized decorators for classes, temporary fix by manually adding the type
    serializableTypes["dspace:TransferCompletionMessage"] =
      TransferCompletionMessage;
    const result = await deserialize<TransferCompletionMessage>(jsonLd);
    result.validate();
  }).rejects.toThrowError(ClassValidationError);
});
