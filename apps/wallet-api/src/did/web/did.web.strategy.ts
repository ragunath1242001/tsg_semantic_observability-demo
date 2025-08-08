import { Logger } from "@nestjs/common";
import { VERIFICATION_METHOD_CONTEXT } from "@tsg-dsp/common-signing-and-validation";
import { DIDDocument, Service, VerificationMethod } from "did-resolver";

import { DidServiceConfig, RootConfig } from "../../config.js";
import { KeyMaterialDao } from "../../model/credentials.dao.js";
import { createServices, createVerificationMethods } from "../../utils/did.js";
import { DidStrategy } from "../did.service.js";

export class DidWebStrategy implements DidStrategy {
  private readonly logger = new Logger(this.constructor.name);

  createDid(config: RootConfig): string {
    return `did:web:${config.server.publicDomain.replace(":", "%3A")}`;
  }

  async createDidDocument(
    config: RootConfig,
    didId: string,
    keys: KeyMaterialDao[],
    services: DidServiceConfig[]
  ): Promise<{ didId: string; didDocument: DIDDocument }> {
    this.logger.log("Creating DID document");

    const didDocument: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
        ...VERIFICATION_METHOD_CONTEXT
      ],
      id: didId,
      verificationMethod: createVerificationMethods(
        didId,
        keys,
        config.did.keyFormat
      ),
      assertionMethod: keys.map((key) => `${didId}#${key.id}`),
      service: createServices(services)
    };

    this.logger.log(`DID document created for ${didId}`);

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

    return didDocument;
  }

  async setDefaultKey(_didDocument: DIDDocument, _key: KeyMaterialDao) {}

  getWellKnownDidDocument(doc: DIDDocument): DIDDocument {
    return doc;
  }
}
