import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DidStrategy } from "../did.service.js";
import { DidServiceConfig, RootConfig } from "../../config.js";
import { DIDDocument, Service } from "did-resolver";
import { KeyMaterials } from "../../model/credentials.dao.js";
import { AppError } from "../../utils/error.js";
import { InjectRepository } from "@nestjs/typeorm";
import { DIDLogs } from "../../model/did.dao.js";
import { Repository } from "typeorm";
import { base32 } from "multiformats/bases/base32";
import {
  createVerificationMethods,
  DIDMethod,
  VERIFICATION_METHOD_CONTEXT,
} from "../../utils/did.js";
import { createHash } from "crypto";
import { canonicalize } from "json-canonicalize";
import { jwkToMultibase } from "../../utils/keys/keyconverter.js";
import { DIDLog, VerificationMethod } from "./method/interfaces.js";
import { createDID, updateDID } from "./method/method.js";
import { createSigner } from "./method/signing.js";

@Injectable()
export class DidTdwStrategy implements DidStrategy {
  constructor(
    @InjectRepository(DIDLogs)
    private readonly didLogsRepository: Repository<DIDLogs>,
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  private currUpdateKey?: VerificationMethod;

  async getDidLog(scid: string): Promise<string> {
    const logEntries = await this.didLogsRepository.find({
      select: {
        logEntry: true,
      },
      where: {
        scid: scid,
      },
    });
    if (logEntries.length === 0) {
      throw new AppError(`DID Logs not ready yet`, HttpStatus.NOT_FOUND);
    }
    return logEntries.map((row) => JSON.stringify(row.logEntry)).join("\n");
  }

  createDid(config: RootConfig): string {
    return `did:tdw:${config.server.publicDomain.replace(":", "%3A")}:{SCID}`;
  }

  private prepareAssertionMethods(
    verificationMethods?: VerificationMethod[],
  ): VerificationMethod[] {
    if (verificationMethods == null) {
      return [];
    }
    let vmsWithAssertionMethods: VerificationMethod[] =
      verificationMethods.slice();
    for (var i = 0; i < verificationMethods.length; i++) {
      vmsWithAssertionMethods.push({
        id: vmsWithAssertionMethods[i].id,
        controller: vmsWithAssertionMethods[i].controller,
        type: "assertionMethod",
      });
    }
    return vmsWithAssertionMethods;
  }

  getCurrUpdateKey(): VerificationMethod {
    if (!this.currUpdateKey) {
      throw new AppError(
        `No DID default key present`,
        HttpStatus.NOT_FOUND,
      ).andLog(this.logger);
    }
    return this.currUpdateKey;
  }

  async createDidDocAndSaveLog(
    config: RootConfig,
    didId: string,
    keys: KeyMaterials[],
    services: DidServiceConfig[],
  ): Promise<{
    did: string;
    doc: DIDDocument;
    log: DIDLog;
  }> {
    const created = await createDID({
      domain: config.server.publicDomain.replace(":", "%3A"),
      updateKeys: [this.getCurrUpdateKey().publicKeyMultibase!],
      signer: createSigner(this.getCurrUpdateKey()),
      context: VERIFICATION_METHOD_CONTEXT,
      verificationMethods: this.prepareAssertionMethods(
        createVerificationMethods(didId, keys),
      ),
      service: services,
    });

    this.didLogsRepository.clear();
    await this.didLogsRepository.save({
      scid: created.log[0][3].scid,
      logEntry: created.log[0],
    });

    return { did: created.did, doc: created.doc, log: created.log };
  }

  async createDidDocument(
    config: RootConfig,
    didId: string,
    keys: KeyMaterials[],
    services: DidServiceConfig[],
  ): Promise<{ didId: string; didDocument: DIDDocument }> {
    this.logger.log("Creating DID document");

    if (keys.length === 0) {
      throw new AppError(
        `Keys not supplied for DID document creation`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let defaultKey = keys.find((k) => k.default);
    if (defaultKey === undefined) {
      defaultKey = keys[0];
    }
    this.currUpdateKey = {
      publicKeyMultibase: jwkToMultibase(defaultKey.publicKey),
      secretKeyMultibase: jwkToMultibase(defaultKey.privateKey, true),
      type: defaultKey.type,
    };

    const created = await this.createDidDocAndSaveLog(
      config,
      didId,
      keys,
      services,
    );

    this.logger.log(`DID document created for ${created.did}`);
    this.logger.debug(
      `DID document ${created.did}\n${JSON.stringify(created.doc, null, 2)}`,
    );

    return { didId: created.did, didDocument: created.doc };
  }

  async updateDidDocument(
    didDocument: DIDDocument,
    verificationMethods?: VerificationMethod[],
    services?: Service[],
  ): Promise<DIDDocument> {
    this.logger.log("Updating DID document");

    const existingLogs = await this.didLogsRepository.find({
      select: {
        scid: true,
        logEntry: true,
      },
    });
    if (existingLogs.length === 0) {
      throw new AppError(`DID Document not ready yet`, HttpStatus.NOT_FOUND);
    }
    const logEntries = existingLogs.map((row) => row.logEntry);
    const scid = existingLogs[0].scid;

    const updated = await updateDID({
      log: logEntries,
      signer: createSigner(this.getCurrUpdateKey()),
      context: VERIFICATION_METHOD_CONTEXT,
      verificationMethods: this.prepareAssertionMethods(verificationMethods),
      services: services,
    });

    this.logger.log(`DID document updated for ${updated.did}`);
    this.logger.debug(
      `DID document ${updated.did}\n${JSON.stringify(updated.doc, null, 2)}`,
    );

    await this.didLogsRepository.save({
      scid: scid,
      logEntry: updated.log[updated.log.length - 1],
    });

    return updated.doc;
  }

  async setDefaultKey(didDocument: DIDDocument, key: KeyMaterials) {
    if (!this.currUpdateKey) {
      this.currUpdateKey = {
        publicKeyMultibase: jwkToMultibase(key.publicKey),
        secretKeyMultibase: jwkToMultibase(key.privateKey, true),
        type: key.type,
      };
      return;
    }

    const existingLogs = await this.didLogsRepository.find({
      select: {
        scid: true,
        logEntry: true,
      },
    });
    const logEntries = existingLogs.map((row) => row.logEntry);
    const scid = existingLogs[0].scid;

    const newUpdateKey: VerificationMethod = {
      publicKeyMultibase: jwkToMultibase(key.publicKey),
      secretKeyMultibase: jwkToMultibase(key.privateKey, true),
      type: key.type,
    };

    const prerotated = await updateDID({
      log: logEntries,
      signer: createSigner(this.getCurrUpdateKey()),
      context: VERIFICATION_METHOD_CONTEXT,
      verificationMethods: this.prepareAssertionMethods(
        didDocument.verificationMethod,
      ),
      services: didDocument.service,
      prerotate: true,
      nextKeyHashes: [
        base32.encode(
          createHash("sha256")
            .update(canonicalize(newUpdateKey.publicKeyMultibase!))
            .digest(),
        ),
      ],
    });
    await this.didLogsRepository.save({
      scid: scid,
      logEntry: prerotated.log[prerotated.log.length - 1],
    });

    const updated = await updateDID({
      log: prerotated.log,
      signer: createSigner(this.getCurrUpdateKey()),
      context: VERIFICATION_METHOD_CONTEXT,
      verificationMethods: this.prepareAssertionMethods(
        didDocument.verificationMethod,
      ),
      services: didDocument.service,
      updateKeys: [newUpdateKey.publicKeyMultibase!],
    });
    await this.didLogsRepository.save({
      scid: scid,
      logEntry: updated.log[updated.log.length - 1],
    });

    this.currUpdateKey = newUpdateKey;
  }

  getWellKnownDidDocument(doc: DIDDocument): DIDDocument {
    const did = doc.id;
    const newDoc = JSON.parse(
      JSON.stringify(doc).replaceAll(DIDMethod.TDW, DIDMethod.WEB),
    );
    if (newDoc.alsoKnownAs) {
      newDoc.alsoKnownAs.push(did);
    } else {
      newDoc.alsoKnownAs = [did];
    }
    return newDoc;
  }
}
