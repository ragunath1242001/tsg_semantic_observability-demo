import { TransferCompletionMessage } from "./dsp/transfer/messages";
import { deserialize } from "./deserialize";
import { ClassValidationError } from "./dsp/common";
import { expect, test } from "@jest/globals";
import { defaultContext } from "../jsonld/context.defaults";
import { serializableTypes } from "./decorators";

test("Validation", async () => {
  const jsonLd = {
    "@context": defaultContext(),
    "@type": "dspace:TransferCompletionMessage",
    "dspace:processId": "",
  };
  expect(async () => {
    serializableTypes["dspace:TransferCompletionMessage"] =
      TransferCompletionMessage;
    const result = await deserialize<TransferCompletionMessage>(jsonLd);
    result.validate();
  }).rejects.toThrowError(ClassValidationError);
});
