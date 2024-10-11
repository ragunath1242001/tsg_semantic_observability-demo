import axios from "axios";
import { DIDDocument } from "did-resolver";
import { AppError } from "../../utils/error.js";
import { HttpStatus, Logger } from "@nestjs/common";
import { DidResolverStrategy } from "../did.resolver.service.js";

export class DidWebResolverStrategy implements DidResolverStrategy {
  private readonly logger = new Logger(this.constructor.name);

  async resolve(didId: string): Promise<DIDDocument> {
    let [host, ...paths] = didId.slice(8).split(":");
    host = decodeURIComponent(host);
    paths = paths.map((path) => decodeURIComponent(path));
    let url: string;
    const protocol = host.startsWith("localhost") ? "http" : "https";
    if (paths.length === 0) {
      url = `${protocol}://${host}/.well-known/did.json`;
    } else {
      url = `${protocol}://${host}/${paths.join("/")}/did.json`;
    }
    try {
      const response = await axios.get<DIDDocument>(url);
      return response.data;
    } catch (err) {
      throw new AppError(
        `Could not load DID document for ${didId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }
}
