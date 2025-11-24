import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ProjectAgreementDetailDto,
  ProjectAgreementDto,
  ProjectAgreementFinalizationMessage,
  SignatureRequestMessage,
  SignatureResponseMessage
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError, ServerConfig } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  DataPlaneError,
  ITransferHandler,
  NegotiationClientService,
  TransferClientService,
  WalletClientService
} from "@tsg-dsp/common-data-plane-api";
import { TransferState } from "@tsg-dsp/common-dsp";
import { CredentialOffer, OfferGrants } from "@tsg-dsp/wallet-dtos";
import { deepStrictEqual } from "assert";
import axios from "axios";
import crypto from "crypto";
import { Repository } from "typeorm";

import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { getAxiosConfigFromDataAddress } from "../utils/axios.js";
import { promiseAllOrThrow } from "../utils/promises.js";
import { parseToken } from "../utils/token.js";
import {
  ProjectAgreementCallbackDao,
  ProjectAgreementDao
} from "./project-agreement.dao.js";

@Injectable()
export class ProjectAgreementsService {
  constructor(
    @InjectRepository(ProjectAgreementDao)
    private readonly projectAgreementsRepository: Repository<ProjectAgreementDao>,
    @InjectRepository(ProjectAgreementCallbackDao)
    private readonly callbackRepository: Repository<ProjectAgreementCallbackDao>,
    private readonly catalog: CatalogClientService,
    private readonly negotiation: NegotiationClientService,
    private readonly transfer: TransferClientService,
    private readonly wallet: WalletClientService,
    private readonly dataplaneService: DataPlaneService,
    @Inject(ITransferHandler)
    private readonly transferHandler: AnalyticsTransferHandler,
    private readonly serverConfig: ServerConfig
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async findAll(): Promise<ProjectAgreementDao[]> {
    return this.projectAgreementsRepository.find();
  }

  async findAllDto(): Promise<ProjectAgreementDetailDto[]> {
    const agreements = await this.findAll();
    return agreements.map((agreement) => ({
      id: agreement.id,
      initiator: agreement.initiator,
      projectAgreement: agreement.projectAgreement,
      signatures: agreement.signatures,
      hash: agreement.hash,
      status: agreement.status,
      datasets: agreement.datasets.map((ds) => ({
        id: ds.identifier,
        title: ds.dataset.title ?? ds.identifier
      }))
    }));
  }

  async findById(id: number): Promise<ProjectAgreementDao> {
    const projectAgreement = await this.projectAgreementsRepository.findOne({
      where: { id }
    });
    if (!projectAgreement) {
      throw new DataPlaneError(
        `Project Agreement with id ${id} not found`,
        404
      );
    }
    return projectAgreement;
  }

  async findByProjectId(projectId: string): Promise<ProjectAgreementDao> {
    const projectAgreement = await this.projectAgreementsRepository.findOne({
      where: { projectId }
    });
    if (!projectAgreement) {
      throw new DataPlaneError(
        `Project Agreement with projectId ${projectId} not found`,
        404
      );
    }
    return projectAgreement;
  }

  async findByHash(hash: string): Promise<ProjectAgreementDao> {
    const projectAgreement = await this.projectAgreementsRepository.findOne({
      where: { hash }
    });
    if (!projectAgreement) {
      throw new DataPlaneError(
        `Project Agreement with hash ${hash} not found`,
        404
      );
    }
    return projectAgreement;
  }

  async linkDatasetToProjectAgreement(
    projectAgreementId: number,
    datasetId: string
  ): Promise<void> {
    const projectAgreement = await this.findById(projectAgreementId);
    if (!projectAgreement.hash) {
      throw new DataPlaneError(
        `Project Agreement with id ${projectAgreementId} is not finalized yet`,
        400
      ).andLog(this.logger);
    }

    if (projectAgreement.datasets.find((ds) => ds.identifier === datasetId)) {
      throw new DataPlaneError(
        `Dataset with id ${datasetId} is already linked to project agreement ${projectAgreementId}`,
        400
      ).andLog(this.logger);
    }

    const datasetDto = await this.dataplaneService.getDataset(datasetId);
    if (!datasetDto.hasPolicy) {
      datasetDto.hasPolicy = [];
    }
    datasetDto.hasPolicy.push({
      "@id": `urn:tsg:project-agreement:${projectAgreement.projectId}`,
      "@type": "Offer",
      assigner: await this.catalog.getParticipantId(),
      assignee: projectAgreement.projectAgreement.participants.map(
        (p) => p.didId
      ),
      permission: [
        {
          "@type": "Permission",
          target: datasetDto["@id"],
          action: "use",
          constraint: [
            {
              "@type": "Constraint",
              leftOperand: "tsg:presentationScope",
              operator: "EQ",
              rightOperand: `nl.tsg.adp.project:${encodeURIComponent(projectAgreement.initiator)}:${projectAgreement.hash}`
            }
          ]
        }
      ]
    });
    await this.dataplaneService.updateDataset(datasetId, datasetDto);
    await this.projectAgreementsRepository.save({
      ...projectAgreement,
      datasets: [
        ...projectAgreement.datasets,
        { identifier: datasetId, dataset: datasetDto }
      ]
    });
  }

  async unlinkDatasetFromProjectAgreement(
    projectAgreementId: number,
    datasetId: string
  ): Promise<void> {
    const projectAgreement = await this.findById(projectAgreementId);
    if (!projectAgreement.hash) {
      throw new DataPlaneError(
        `Project Agreement with id ${projectAgreementId} is not finalized yet`,
        400
      ).andLog(this.logger);
    }
    const datasetDto = await this.dataplaneService.getDataset(datasetId);
    datasetDto.hasPolicy = datasetDto.hasPolicy?.filter(
      (policy) =>
        policy["@id"] !==
        `urn:tsg:project-agreement:${projectAgreement.projectId}`
    );
    await this.dataplaneService.updateDataset(datasetId, datasetDto);
    await this.projectAgreementsRepository.save({
      ...projectAgreement,
      datasets: projectAgreement.datasets.filter(
        (ds) => ds.identifier !== datasetId
      )
    });
  }

  async create(
    projectAgreementDto: ProjectAgreementDto
  ): Promise<ProjectAgreementDetailDto> {
    this.logger.log(
      `Creating project agreement with id ${projectAgreementDto.id}`
    );
    const ownParticipantId = await this.catalog.getParticipantId();
    const callbacks = projectAgreementDto.participants
      .filter(({ didId }) => didId !== ownParticipantId)
      .flatMap(({ didId }) => {
        const token = crypto.randomBytes(32).toString("hex");
        return this.callbackRepository.create({
          participantId: didId,
          url: this.serverConfig.publicAddress,
          authToken: token
        });
      });
    const projectAgreement: ProjectAgreementDao =
      await this.projectAgreementsRepository.save({
        projectId: projectAgreementDto.id,
        projectAgreement: projectAgreementDto,
        initiator: ownParticipantId,
        status: "WAITING_FOR_SIGNATURES",
        signatures: {},
        callbacks
      });

    setImmediate(() => {
      this.requestSignatures(projectAgreement);
    });

    return {
      id: projectAgreement.id,
      initiator: projectAgreement.initiator,
      projectAgreement: projectAgreement.projectAgreement,
      signatures: projectAgreement.signatures,
      hash: projectAgreement.hash,
      status: projectAgreement.status,
      datasets: []
    };
  }

  async requestSignatures(projectAgreement: ProjectAgreementDao) {
    this.logger.log(
      `Requesting signatures for project agreement ${projectAgreement.id}`
    );
    await promiseAllOrThrow(
      projectAgreement.callbacks,
      async (callback) => this.initiateAgreement(callback, projectAgreement),
      this.logger
    );
  }

  private async initiateTransfer(callback: ProjectAgreementCallbackDao) {
    this.logger.log(`Initiating transfer for callback ${callback.id}`);
    const orchestrationDataset = await this.catalog.getDatasetConformingTo(
      "tsg:project-agreement",
      callback.participantId
    );
    const negotiation = await this.negotiation.requestDefaultNegotiation(
      orchestrationDataset["@id"],
      callback.participantId,
      undefined,
      async () => orchestrationDataset
    );
    if (!negotiation.agreement) {
      throw new DataPlaneError(
        `No agreement found for negotiation ${negotiation.localId}`,
        400
      ).andLog(this.logger);
    }
    const transferDto = await this.transfer.requestTransfer(
      negotiation.agreement["@id"],
      callback.participantId,
      undefined
    );
    const temporaryTransfer = await this.transferHandler.getTransferByProcessId(
      transferDto.consumerPid
    );

    return await new Promise<TransferDao>((resolve) => {
      this.transferHandler.addListener(
        temporaryTransfer.id,
        TransferState.STARTED,
        resolve
      );
    }).then((transfer) => {
      if (!transfer.dataAddress) {
        throw new DataPlaneError(
          `Transfer with id ${transferDto.consumerPid} does not have a data address`,
          404
        ).andLog(this.logger);
      }
      return transfer;
    });
  }

  private async initiateAgreement(
    callback: ProjectAgreementCallbackDao,
    projectAgreement: ProjectAgreementDao
  ) {
    this.logger.log(`Initiating agreement with ${callback.participantId}`);
    const transfer = await this.initiateTransfer(callback);
    try {
      const signatureRequestMessage: SignatureRequestMessage = {
        projectAgreement: projectAgreement.projectAgreement,
        callback: {
          url: `${this.serverConfig.publicAddress}/project-agreements/signature-callback`,
          authToken: callback.authToken
        }
      };
      this.logger.log(
        `Sending signature request to ${transfer.dataAddress!.endpoint}`
      );
      await axios.post(
        `${transfer.dataAddress!.endpoint}/project-agreements/signature-request`,
        signatureRequestMessage,
        getAxiosConfigFromDataAddress(transfer)
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `Failed to initiate transfer with id ${transfer.id}`
      ).andLog(this.logger);
    }
  }

  async handleSignatureRequestMessage(
    message: SignatureRequestMessage,
    authorizationHeader: string | undefined
  ): Promise<void> {
    const token = parseToken(authorizationHeader);
    const transfer = await this.transferHandler.getTransferBySecret(token);
    await this.projectAgreementsRepository.save({
      projectId: message.projectAgreement.id,
      projectAgreement: message.projectAgreement,
      initiator: transfer.remoteParty,
      status: "SIGNATURE_REQUESTED",
      signatures: {},
      callbacks: [
        this.callbackRepository.create({
          participantId: transfer.remoteParty,
          url: message.callback.url,
          authToken: message.callback.authToken
        })
      ]
    });
  }

  async signProjectAgreement(id: number) {
    const projectAgreement = await this.findById(id);
    const ownParticipantId = await this.catalog.getParticipantId();

    const { jwt } = await this.wallet.requestSignature({
      body: {
        projectAgreement: projectAgreement.projectAgreement
      },
      audience: projectAgreement.initiator,
      subject: ownParticipantId,
      expirationTime: projectAgreement.projectAgreement.validUntil
    });

    projectAgreement.signatures[ownParticipantId] = jwt;
    if (projectAgreement.callbacks.length !== 1) {
      throw new DataPlaneError(
        `Expected exactly one callback for project agreement ${id}, found ${projectAgreement.callbacks.length}`,
        500
      ).andLog(this.logger);
    }
    const callback = projectAgreement.callbacks[0];
    try {
      const signatureResponse: SignatureResponseMessage = {
        participantId: ownParticipantId,
        projectId: projectAgreement.projectId,
        signature: jwt
      };
      await axios.post(callback.url, signatureResponse, {
        headers: {
          Authorization: `Bearer ${callback.authToken}`
        }
      });
      projectAgreement.status = "SIGNED";
      await this.projectAgreementsRepository.save(projectAgreement);
    } catch (error) {
      throw parseNetworkError(
        error,
        `sending signature callback for project agreement ${id}`
      ).andLog(this.logger);
    }
  }

  async handleSignatureCallback(
    message: SignatureResponseMessage,
    authorizationHeader?: string
  ): Promise<void> {
    const ownParticipantId = await this.catalog.getParticipantId();
    const token = parseToken(authorizationHeader);
    const projectAgreement = await this.findByProjectId(message.projectId);
    if (!projectAgreement) {
      throw new DataPlaneError(
        `Project agreement with id ${message.projectId} not found`,
        404
      ).andLog(this.logger);
    }
    if (
      projectAgreement.callbacks.find(
        (callback) =>
          callback.participantId === message.participantId &&
          callback.authToken === token
      ) === undefined
    ) {
      throw new DataPlaneError(
        `Unauthorized signature callback from participant ${message.participantId} for project agreement ${message.projectId}`,
        403
      ).andLog(this.logger);
    }
    const validated = await this.wallet.validateSignature({
      jwt: message.signature,
      jti: false
    });
    try {
      deepStrictEqual(
        validated["projectAgreement"],
        projectAgreement.projectAgreement,
        "Project agreement content does not match the signed content"
      );
    } catch (_) {
      this.logger.debug(
        `Expected: ${JSON.stringify(projectAgreement.projectAgreement)}`
      );
      this.logger.debug(
        `Actual:   ${JSON.stringify(validated["projectAgreement"])}`
      );
      throw new DataPlaneError(
        `Non matching project agreement content for participant ${message.participantId}`,
        400
      ).andLog(this.logger);
    }

    projectAgreement.signatures[message.participantId] = message.signature;
    const requiredSignatures = projectAgreement.projectAgreement.participants
      .filter((p) => p.didId !== ownParticipantId)
      .map((p) => p.didId);
    const signaturesReceived = Object.keys(projectAgreement.signatures);
    const allSignaturesReceived = requiredSignatures.every((participantId) =>
      signaturesReceived.includes(participantId)
    );
    if (allSignaturesReceived) {
      projectAgreement.status = "SIGNED";
    }
    const { jwt } = await this.wallet.requestSignature({
      body: {
        projectAgreement: projectAgreement.projectAgreement
      },
      audience: projectAgreement.initiator,
      subject: ownParticipantId,
      expirationTime: projectAgreement.projectAgreement.validUntil
    });
    projectAgreement.signatures[ownParticipantId] = jwt;
    const hash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          projectAgreement: projectAgreement.projectAgreement,
          signatures: projectAgreement.signatures
        })
      )
      .digest("hex");
    projectAgreement.hash = hash;
    await this.projectAgreementsRepository.save(projectAgreement);

    const credentialOffers = await promiseAllOrThrow(
      projectAgreement.callbacks,
      async (callback) => {
        return {
          offer: await this.wallet.createOffer({
            holderId: callback.participantId,
            credentialType: "ProjectAgreementCredential",
            credentialSubject: {
              id: callback.participantId,
              hash: hash
            }
          }),
          callback
        };
      },
      this.logger
    );
    await this.projectAgreementsRepository.save(projectAgreement);
    setImmediate(async () => {
      await promiseAllOrThrow(
        credentialOffers,
        async (callbackOffer) =>
          this.finalizeAgreement(
            callbackOffer.callback,
            callbackOffer.offer,
            projectAgreement
          ),
        this.logger
      );
      const offer = await this.wallet.createOffer({
        holderId: ownParticipantId,
        credentialType: "ProjectAgreementCredential",
        credentialSubject: {
          id: ownParticipantId,
          hash: hash
        }
      });
      await this.wallet.requestOfferViaDCP({
        issuerId: ownParticipantId,
        preAuthorizedCode:
          offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
            "pre-authorized_code"
          ] ?? "",
        credentialType: ["ProjectAgreementCredential"]
      });
      projectAgreement.status = "FINALIZED";
      await this.projectAgreementsRepository.save(projectAgreement);
    });
  }

  private async finalizeAgreement(
    callback: ProjectAgreementCallbackDao,
    offer: CredentialOffer,
    projectAgreement: ProjectAgreementDao
  ) {
    const ownParticipantId = await this.catalog.getParticipantId();
    const transfer = await this.initiateTransfer(callback);
    try {
      const projectAgreementFinalizationMessage: ProjectAgreementFinalizationMessage =
        {
          projectId: projectAgreement.projectAgreement.id,
          hash: projectAgreement.hash!,
          signatures: projectAgreement.signatures,
          offer: {
            issuerId: ownParticipantId,
            preAuthorizedCode:
              offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
                "pre-authorized_code"
              ] ?? "",
            credentialType: ["ProjectAgreementCredential"]
          }
        };
      await axios.post(
        `${transfer.dataAddress!.endpoint}/project-agreements/finalization`,
        projectAgreementFinalizationMessage,
        getAxiosConfigFromDataAddress(transfer)
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `Failed to initiate transfer with id ${transfer.id}`
      ).andLog(this.logger);
    }
  }

  async handleFinalizationMessage(
    message: ProjectAgreementFinalizationMessage,
    authorizationHeader?: string
  ): Promise<void> {
    const token = parseToken(authorizationHeader);
    const transfer = await this.transferHandler.getTransferBySecret(token);
    const projectAgreement = await this.findByProjectId(message.projectId);
    if (!projectAgreement) {
      throw new DataPlaneError(
        `Project agreement with id ${message.projectId} not found`,
        404
      ).andLog(this.logger);
    }
    if (projectAgreement.initiator !== transfer.remoteParty) {
      throw new DataPlaneError(
        `Unauthorized finalization attempt by participant ${transfer.remoteParty} for project agreement ${message.projectId}`,
        403
      ).andLog(this.logger);
    }
    projectAgreement.hash = message.hash;
    projectAgreement.signatures = message.signatures;
    projectAgreement.status = "FINALIZED";
    await this.wallet.requestOfferViaDCP(message.offer);
    await this.projectAgreementsRepository.save(projectAgreement);
  }
}
