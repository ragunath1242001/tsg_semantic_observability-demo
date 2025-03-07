import { expect, test } from "@jest/globals";

import { defaultContext } from "../jsonld/context.defaults.js";
import { serializableTypes } from "./decorators.js";
import { deserialize } from "./deserialize.js";
import { ClassValidationError } from "./dsp/common.js";
import { TransferCompletionMessage } from "./dsp/transfer/messages.js";

test("Validation", async () => {
  const jsonLd = {
    "@context": defaultContext(),
    "@type": "dspace:TransferCompletionMessage",
    "dspace:processId": ""
  };
  expect(async () => {
    serializableTypes["dspace:TransferCompletionMessage"] =
      TransferCompletionMessage;
    const result = await deserialize<TransferCompletionMessage>(jsonLd);
    result.validate();
  }).rejects.toThrowError(ClassValidationError);
});
