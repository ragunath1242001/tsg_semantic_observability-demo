import * as jsonld from "jsonld";
import { JsonLdObj } from "jsonld/jsonld-spec";
import { defaultContext, dspContextUrl } from "./context.defaults";
import { documentLoader } from "./documentLoader";

const compactingContext = (
  context: "default" | "dsp" | string | string[]
): jsonld.ContextDefinition => {
  let usingContext: string | string[];
  switch (context) {
    case "default":
      usingContext = defaultContext();
      break;
    case "dsp":
      usingContext = dspContextUrl;
      break;
    default:
      usingContext = context;
      break;
  }
  return usingContext as unknown as jsonld.ContextDefinition;
};

export async function compact(
  document: jsonld.JsonLdDocument,
  context: "default" | "dsp" | string | string[] = "default"
): Promise<JsonLdObj> {
  const expanded = await jsonld.expand(document, documentLoader);
  const usingContext = compactingContext(context);
  const compacted = await jsonld.compact(
    expanded,
    usingContext,
    documentLoader
  );
  return compacted;
}

export async function flatten(
  document: jsonld.JsonLdDocument
): Promise<JsonLdObj> {
  return await jsonld.flatten(document);
}

export async function frame(
  document: jsonld.NodeObject,
  embed: boolean,
  context: "default" | "dsp" | string[] = "default",
  type: string | undefined
): Promise<JsonLdObj> {
  const flattened = await flatten(document);
  const usingContext = compactingContext(context);
  let usingType = type || document["@type"];
  if (!usingType) {
    throw Error(
      "Could not frame document, missing type in function call and document"
    );
  }
  return await jsonld.frame(
    flattened,
    { "@context": usingContext, "@type": usingType },
    {
      ...(embed ? { embed: "@always" } : {})
    }
  );
}
