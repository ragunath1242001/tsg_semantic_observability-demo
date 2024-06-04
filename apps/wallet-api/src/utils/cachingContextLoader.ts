import { Logger } from "@nestjs/common";
import jsonld from "jsonld";
import { JsonLd, RemoteDocument } from "jsonld/jsonld-spec.js";

interface CacheEntry {
  time: number;
  context: JsonLd;
}

const cachedContexts = new Map<String, CacheEntry>();

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const nodeDocumentLoader: (url: string) => Promise<RemoteDocument> = (
  jsonld as any
).documentLoaders.node();
export const jsonldOptions: jsonld.Options.DocLoader = {
  async documentLoader(url): Promise<RemoteDocument> {
    const cacheEntry = cachedContexts.get(url);
    if (cacheEntry) {
      if (cacheEntry.time + 24 * 60 * 60 * 1000 > new Date().getTime()) {
        return {
          contextUrl: undefined,
          document: cacheEntry.context,
          documentUrl: url,
        };
      }
    }
    Logger.debug(`Loading document ${url}`, "CachingContextLoader");
    const loadedDocument = await nodeDocumentLoader(url);
    cachedContexts.set(url, {
      time: new Date().getTime(),
      context: loadedDocument.document,
    });
    return loadedDocument;
  },
};
