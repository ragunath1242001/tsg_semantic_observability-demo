import { Injectable, Logger } from "@nestjs/common";
import { DIDDocument } from "did-resolver";
import { DIDDocuments, KeyMaterials } from "../model/credentials.dao.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RootConfig } from "../config.js";
import { keyTypes, signingAlgorithm } from "../utils/keymapping.js";

@Injectable()
export class DidService {
  private readonly didId: string;
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(DIDDocuments)
    private readonly didRepository: Repository<DIDDocuments>
  ) {
    this.didId = `did:web:${this.config.server.publicDomain.replace(
      ":",
      "%3A"
    )}`;
  }

  private readonly logger = new Logger(this.constructor.name);

  async getDidId(): Promise<string> {
    return this.didId;
  }

  async getDid(): Promise<DIDDocument | undefined> {
    const did = await this.didRepository.find({});
    return did[0]?.document;
  }

  async createDidDocument(keys: KeyMaterials[]): Promise<DIDDocument> {
    this.logger.log("Creating DID document");

    const didDocument: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
      ],
      id: this.didId,
      verificationMethod: keys.map((key) => {
        return {
          id: `${this.didId}#${key.id}`,
          type: "JsonWebKey2020",
          controller: this.didId,
          publicKeyJwk: {
            kty: keyTypes(key.type),
            alg: signingAlgorithm(key.type),
            ...key.publicKey,
          },
        };
      }),
      assertionMethod: keys.map((key) => `${this.didId}#${key.id}`),
      service: [
        {
          id: `${this.didId}#oid4vci`,
          type: "OID4VCI",
          serviceEndpoint: this.config.server.publicAddress,
        },
        {
          id: `${this.didId}#presentation`,
          type: "PresentationService",
          serviceEndpoint: `${this.config.server.publicAddress}${
            process.env["EMBEDDED_FRONTEND"] ? "/api" : ""
          }/iatp/holder/presentation`,
        },
        ...this.config.didServices,
      ],
    };
    this.logger.log(`DID document created for ${this.didId}`);
    this.logger.debug(
      `DID document ${this.didId}\n${JSON.stringify(didDocument, null, 2)}`
    );
    const existing = await this.didRepository.find({});
    if (existing[0]) {
      await this.didRepository.clear();
    }
    await this.didRepository.save({
      document: didDocument,
    });
    return didDocument;
  }
}
