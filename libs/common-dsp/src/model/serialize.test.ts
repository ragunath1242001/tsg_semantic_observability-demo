import { expect, test } from "@jest/globals";

import { defaultContext } from "../jsonld/context.defaults.js";
import { serializableTypes } from "./decorators.js";
import { deserialize } from "./deserialize.js";
import { ClassValidationError } from "./dsp/common.js";
import { TransferCompletionMessageDto } from "./dsp/index.js";
import { TransferCompletionMessage } from "./dsp/transfer/messages.js";

test("Validation", async () => {
  const jsonLd: Partial<TransferCompletionMessageDto> = {
    "@context": defaultContext(),
    "@type": "TransferCompletionMessage",
    providerPid: ""
  };
  expect(async () => {
    serializableTypes["TransferCompletionMessage"] = TransferCompletionMessage;
    const result = await deserialize<TransferCompletionMessage>(jsonLd);
    result.validate();
  }).rejects.toThrow(ClassValidationError);
});
