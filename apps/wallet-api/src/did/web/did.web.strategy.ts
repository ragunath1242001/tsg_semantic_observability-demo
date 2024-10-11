import { Logger } from "@nestjs/common";
import { DidStrategy } from "../did.service.js";
import { DidServiceConfig, RootConfig } from "../../config.js";
import { DIDDocument, Service, VerificationMethod } from "did-resolver";
import { KeyMaterials } from "../../model/credentials.dao.js";
import {
  createServices,
  createVerificationMethods,
  VERIFICATION_METHOD_CONTEXT,
} from "../../utils/did.js";

export class DidWebStrategy implements DidStrategy {
  private readonly logger = new Logger(this.constructor.name);

  createDid(config: RootConfig): string {
    return `did:web:${config.server.publicDomain.replace(":", "%3A")}`;
  }

  async createDidDocument(
    config: RootConfig,
    didId: string,
    keys: KeyMaterials[],
    services: DidServiceConfig[]
  ): Promise<{ didId: string; didDocument: DIDDocument }> {
    this.logger.log("Creating DID document");

    const didDocument: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        ...VERIFICATION_METHOD_CONTEXT,
      ],
      id: didId,
      verificationMethod: createVerificationMethods(didId, keys),
      assertionMethod: keys.map((key) => `${didId}#${key.id}`),
      service: createServices(services),
    };

    this.logger.log(`DID document created for ${didId}`);
    this.logger.debug(
      `DID document ${didId}\n${JSON.stringify(didDocument, null, 2)}`
    );

    return { didId: didId, didDocument: didDocument };
  }

  async updateDidDocument(
    didDocument: DIDDocument,
    verificationMethods?: VerificationMethod[],
    services?: Service[]
  ): Promise<DIDDocument> {
    this.logger.log("Updating DID document");

    didDocument.verificationMethod = verificationMethods;
    didDocument.assertionMethod = verificationMethods
      ? verificationMethods.map((vm) => `${didDocument.id}#${vm.id}`)
      : undefined;
    didDocument.service = services;

    this.logger.log(`DID document updated for ${didDocument.id}`);
    this.logger.debug(
      `DID document ${didDocument.id}\n${JSON.stringify(didDocument, null, 2)}`
    );

    return didDocument;
  }

  async setDefaultKey(didDocument: DIDDocument, key: KeyMaterials) {}

  getWellKnownDidDocument(doc: DIDDocument): DIDDocument {
    return doc;
  }
}
