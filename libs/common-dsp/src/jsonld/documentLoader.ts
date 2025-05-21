import jsonld from "jsonld";
import { RemoteDocument } from "jsonld/jsonld-spec.js";

import {
  dereferencedDspContext,
  dspContextUrl,
  dspOdrlProfileContext,
  dspOdrlProfileContextUrl,
  healthContext,
  healthContextUrl,
  tsgContext,
  tsgContextUrl
} from "./context.defaults.js";

const documentCache: Record<string, RemoteDocument> = {};

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
          document: dereferencedDspContext,
          documentUrl: url
        };
      case dspOdrlProfileContextUrl:
        return {
          contextUrl: undefined,
          document: dspOdrlProfileContext,
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
