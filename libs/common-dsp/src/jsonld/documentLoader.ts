import { Logger } from "@nestjs/common";
import jsonld from "jsonld";
import { RemoteDocument } from "jsonld/jsonld-spec.js";

import {
  credentialsv2Context,
  credentialsv2ContextUrl,
  dataIntegrityContext,
  dataIntegrityContextUrl,
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

async function refreshDocumentCache() {
  Logger.debug(
    `Refreshing JSONLD document cache for: ${Object.keys(documentCache).join(", ")}`,
    "DocumentLoader"
  );
  const result = await Promise.all(
    Object.keys(documentCache).map(async (url) => {
      try {
        const document = await defaultDocumentLoader(url);
        if (document) {
          documentCache[url] = document;
        }
        return [url, document];
      } catch (_e) {
        return [url, null];
      }
    })
  );
  if (result.some(([, doc]) => !doc)) {
    Logger.warn(
      `Some documents could not be refreshed: ${result
        .filter(([, doc]) => !doc)
        .map(([url]) => url)
        .join(", ")}`,
      "DocumentLoader"
    );
  }
}

if (typeof process !== "undefined" && process.versions?.node) {
  // Refresh the document cache every 24 hours in a Node.js environment
  setInterval(refreshDocumentCache, 24 * 60 * 60 * 1000).unref();
}

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
      case credentialsv2ContextUrl:
        return {
          contextUrl: undefined,
          document: credentialsv2Context,
          documentUrl: url
        };
      case dataIntegrityContextUrl:
        return {
          contextUrl: undefined,
          document: dataIntegrityContext,
          documentUrl: url
        };
    }
    Logger.debug(`Loading JSON-LD Document from URL: ${url}`, "DocumentLoader");
    const document = await defaultDocumentLoader(url);
    documentCache[url] = document;
    return document;
  }
};
