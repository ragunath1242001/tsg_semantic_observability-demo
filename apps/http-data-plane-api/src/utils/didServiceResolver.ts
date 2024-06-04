import { HttpStatus, Logger } from "@nestjs/common";
import axios from "axios";
import { DataPlaneError } from "./errors/error";
import { DIDDocument } from "did-resolver";

export async function resolve(didId: string) {
  if (!didId.startsWith("did:web:")) {
    throw new DataPlaneError(
      "Resolver only supports did:web",
      HttpStatus.NOT_FOUND,
    ).andLog(new Logger("DidResolver"), "log");
  }
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
    throw new DataPlaneError(
      `Could not load DID document for ${didId}`,
      HttpStatus.BAD_REQUEST,
    ).andLog(new Logger("DidResolver"), "log");
  }
}
