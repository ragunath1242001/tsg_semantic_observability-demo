import axios from "axios";
import { DIDDocument } from "did-resolver";
import { AppError } from "../../utils/error.js";
import { HttpStatus, Logger } from "@nestjs/common";
import { DidResolverStrategy } from "../did.resolver.service.js";
import { DIDLog } from "./method/interfaces.js";
import { resolveDID } from "./method/method.js";

export class DidTdwResolverStrategy implements DidResolverStrategy {
  private readonly logger = new Logger(this.constructor.name);

  async resolve(didId: string): Promise<DIDDocument> {
    let [host, ...paths] = didId.slice(8).split(":");
    host = decodeURIComponent(host);
    paths = paths.map((path) => decodeURIComponent(path));
    let url: string;
    const protocol = host.startsWith("localhost") ? "http" : "https";
    if (paths.length === 0) {
      url = `${protocol}://${host}/.well-known/did.jsonl`;
    } else {
      url = `${protocol}://${host}/${paths.join("/")}/did.jsonl`;
    }
    try {
      const response = await axios.get<string>(url);
      let rawLogResponse = response.data;
      if (typeof response.data === "object") {
        rawLogResponse = JSON.stringify(response.data);
      }
      const didLog: DIDLog = rawLogResponse
        .trim()
        .split("\n")
        .map((logEntry) => JSON.parse(logEntry));
      const { doc } = await resolveDID(didLog);
      return doc;
    } catch (_) {
      throw new AppError(
        `Could not load DID document for ${didId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }
}
