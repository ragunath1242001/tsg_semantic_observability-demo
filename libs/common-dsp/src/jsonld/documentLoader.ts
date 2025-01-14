import { FlatCache } from "flat-cache";
import { RemoteDocument } from "jsonld/jsonld-spec.js";
import {
  dspContext,
  tsgContext,
  healthContext,
  tsgContextUrl,
  healthContextUrl,
  dspContextUrl
} from "./context.defaults.js";
import * as jsonld from "jsonld";

const documentCache: Record<string, RemoteDocument> = {};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const defaultDocumentLoader =
  (jsonld as any).documentLoaders?.node?.() ||
  (jsonld as any).documentLoaders?.xhr?.();

export const documentLoader: jsonld.Options.DocLoader = {
  async documentLoader(url): Promise<RemoteDocument> {
    const cacheEntry = documentCache[url];
    if (cacheEntry) {
      return cacheEntry;
    }
    switch (url) {
      case dspContextUrl:
        return {
          contextUrl: undefined,
          document: dspContext,
          documentUrl: url
        };
      case tsgContextUrl("debug"):
        return {
          contextUrl: undefined,
          document: tsgContext,
          documentUrl: url
        };
      case healthContextUrl("debug"):
        return {
          contextUrl: undefined,
          document: healthContext,
          documentUrl: url
        };
    }
    console.debug(`Loading JSON-LD Document: ${url}`);
    const document = await defaultDocumentLoader(url);
    documentCache[url] = document;
    return document;
  }
};
