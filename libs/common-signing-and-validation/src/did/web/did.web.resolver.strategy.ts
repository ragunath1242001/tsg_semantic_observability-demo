import { HttpStatus, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import axios from "axios";
import { DIDDocument } from "did-resolver";

import { DidResolverStrategy } from "../did.resolver.js";

export class DidWebResolverStrategy implements DidResolverStrategy {
  private readonly logger = new Logger(this.constructor.name);

  private isHttpFallbackEnabled(): boolean {
    return ["1", "true", "yes", "on"].includes(
      (process.env.DID_RESOLVER_HTTP_FALLBACK_ENABLED ?? "").toLowerCase()
    );
  }

  private createUrls(host: string, paths: string[]): string[] {
    const preferredProtocol = host.startsWith("localhost") ? "http" : "https";
    const protocols =
      this.isHttpFallbackEnabled() && preferredProtocol === "https"
        ? ["https", "http"]
        : [preferredProtocol];

    return protocols.map((protocol) =>
      paths.length === 0
        ? `${protocol}://${host}/.well-known/did.json`
        : `${protocol}://${host}/${paths.join("/")}/did.json`
    );
  }

  async resolve(didId: string): Promise<DIDDocument> {
    let [host, ...paths] = didId.slice(8).split(":");
    host = decodeURIComponent(host);
    paths = paths.map((path) => decodeURIComponent(path));

    const urls = this.createUrls(host, paths);
    for (const [index, url] of urls.entries()) {
      try {
        const response = await axios.get<DIDDocument>(url);
        if (index > 0) {
          this.logger.warn(`Falling back to HTTP DID resolution for ${didId}`);
        }
        return response.data;
      } catch (_) {
        continue;
      }
    }

    this.logger.warn(
      `Failed to resolve DID ${didId} using URLs: ${urls.join(", ")}`
    );
    throw new AppError(
      `Could not load DID document for ${didId}`,
      HttpStatus.BAD_REQUEST
    ).andLog(this.logger);
  }
}
