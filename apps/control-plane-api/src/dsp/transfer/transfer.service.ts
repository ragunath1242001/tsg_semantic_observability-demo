import { DataPlaneAddressDto, DistributionDto } from "@tsg-dsp/common-dsp";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataAddress,
  EndpointProperty,
  Multilanguage,
  ODRLAction,
  TransferCompletionMessage,
  TransferDetail,
  TransferEvent,
  TransferProcess,
  TransferRequestMessage,
  TransferRole,
  TransferStartMessage,
  TransferState,
  TransferStatus,
  TransferSuspensionMessage,
  TransferTerminationMessage,
  VerifiableCredential,
  deserialize,
  toArray
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { Repository } from "typeorm";
import { RuntimeConfig } from "../../config.js";
import { DataPlaneService } from "../../data-plane/dataPlane.service.js";
import {
  TransferDetailDao,
  TransferEventDao
} from "../../model/transfer.dao.js";
import { DSPError } from "../../utils/errors/error.js";
import { DspClientService } from "../client/client.service.js";
import { DspGateway } from "../client/dsp.gateway.js";
import { PolicyEvaluationService } from "../../policy/policy.evaluation.service.js";
import { EvaluationTrigger } from "../../policy/constraint.dto.js";
import { normalizeAddress } from "../../utils/address.js";
import {
  ServerConfig,
  PaginationOptionsDto,
  Paginated
} from "@tsg-dsp/common-api";

@Injectable()
export class TransferService {
  constructor(
    private readonly dsp: DspClientService,
    private readonly dspGateway: DspGateway,
    private readonly server: ServerConfig,
    private readonly runtime: RuntimeConfig,
    @InjectRepository(TransferDetailDao)
    private readonly transferDetailRepository: Repository<TransferDetailDao>,
    @InjectRepository(TransferEventDao)
    private readonly transferEventRepository: Repository<TransferEventDao>,
    private readonly dataPlaneService: DataPlaneService,
    private readonly policyEvaluationService: PolicyEvaluationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly providerTransitions: Record<TransferState, TransferState[]> =
    {
      [TransferState.REQUESTED]: [
        TransferState.STARTED,
        TransferState.TERMINATED
      ],
      [TransferState.STARTED]: [
        TransferState.SUSPENDED,
        TransferState.COMPLETED,
        TransferState.TERMINATED
      ],
      [TransferState.TERMINATED]: [],
      [TransferState.COMPLETED]: [],
      [TransferState.SUSPENDED]: [
        TransferState.STARTED,
        TransferState.TERMINATED
      ]
    };

  private readonly consumerTransitions: Record<TransferState, TransferState[]> =
    {
      [TransferState.REQUESTED]: [TransferState.TERMINATED],
      [TransferState.STARTED]: [
        TransferState.SUSPENDED,
        TransferState.COMPLETED,
        TransferState.TERMINATED
      ],
      [TransferState.TERMINATED]: [],
      [TransferState.COMPLETED]: [],
      [TransferState.SUSPENDED]: [
        TransferState.STARTED,
        TransferState.TERMINATED
      ]
    };

  private readonly allowedTransitions: Record<
    "remote" | "local",
    Record<TransferRole, Record<TransferState, TransferState[]>>
  > = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions
    }
  };

  private async checkTransition(
    direction: "remote" | "local",
    transfer: TransferDetail,
    to: TransferState
  ) {
    if (
      !this.allowedTransitions[direction][transfer.role][
        transfer.state
      ].includes(to)
    ) {
      const event: TransferEvent = {
        time: new Date(),
        state: to,
        localMessage: `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`,
        type: direction
      };
      const eventObj = this.transferEventRepository.create(event);
      transfer.events.push(eventObj);
      await this.transferDetailRepository.save(transfer);
      throw new DSPError(
        `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
  }

  async getTransfers(
    paginationOptions: PaginationOptionsDto,
    filterStarted: boolean = false
  ): Promise<Paginated<TransferStatus[]>> {
    const [transfers, itemCount] =
      await this.transferDetailRepository.findAndCount({
        select: {
          localId: true,
          remoteId: true,
          role: true,
          remoteAddress: true,
          remoteParty: true,
          state: true,
          process: {
            consumerPid: true,
            providerPid: true,
            state: true
          },
          agreementId: true,
          format: true,
          modifiedDate: true
        },
        skip: paginationOptions.skip,
        take: paginationOptions.take,
        order: {
          [paginationOptions.order_by]: paginationOptions.order
        },
        ...(filterStarted ? { where: { state: TransferState.STARTED } } : {})
      });
    return {
      data: transfers.map((transfer) => new TransferStatus(transfer)),
      total: itemCount
    };
  }

  async getTransfer(
    processId: string,
    audience?: string
  ): Promise<TransferDetail> {
    const transfer = await this.transferDetailRepository.findOneBy({
      localId: processId,
      remoteParty: audience
    });
    if (transfer) {
      return new TransferDetail({
        ...transfer,
        events: transfer.events.sort((a, b) => {
          return new Date(a.time).valueOf() - new Date(b.time).valueOf();
        })
      });
    } else {
      throw new DSPError(
        `Cannot get transfer with process ID ${processId}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
  }

  async getTransfersByAgreement(
    agreementId: string
  ): Promise<TransferDetailDao[]> {
    return await this.transferDetailRepository.findBy({
      agreementId: agreementId
    });
  }

  async initiateTransferProcess(
    agreementId: string,
    remoteAddress: string,
    audience: string,
    format?: string,
    dataPlaneIdentifier?: string
  ): Promise<{
    localId: string;
    remoteId: string;
    message: TransferRequestMessage;
    process: TransferProcess;
  }> {
    let dataAddress: DataAddress | undefined;
    const localId = `urn:uuid:consumer:${crypto.randomUUID()}`;
    const context = await this.policyEvaluationService.initializeContext(
      agreementId,
      "consumer",
      EvaluationTrigger.CONSUMER_ON_REQUEST,
      localId,
      audience,
      ODRLAction.USE,
      []
    );
    let distributions: DistributionDto[] = [];
    if (!format) {
      const datasetAddress = normalizeAddress(
        remoteAddress.split("/transfers")[0],
        0,
        "catalog",
        "datasets"
      );
      const dataset = await this.dsp.requestDataset(
        datasetAddress,
        context.target,
        audience
      );
      distributions = dataset?.["dcat:distribution"] ?? [];
      if (distributions.length > 1) {
        throw new DSPError(
          "Cannot determine format based on dataset, since there are multiple formats in the distributions.",
          HttpStatus.BAD_REQUEST
        );
      } else if (distributions.length == 0) {
        throw new DSPError(
          "Cannot determine format based on dataset, since there are no distributions for this dataset.",
          HttpStatus.BAD_REQUEST
        );
      }
      format = distributions[0]["dct:format"] as string;
    }

    const evaluation = await this.policyEvaluationService.evaluate(context);
    if (evaluation.decision === "DENY") {
      throw new DSPError(
        {
          message: `Policy evaluation denied transfer request`,
          evaluation: evaluation
        },
        HttpStatus.FORBIDDEN
      );
    }
    const transferRequestMessage = new TransferRequestMessage({
      consumerPid: localId,
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      callbackAddress: `${this.server.publicAddress}/transfers/${localId}`
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(
      transferRequestMessage,
      localId,
      "consumer",
      audience,
      dataPlaneIdentifier
    );
    if (dataPlaneTransfer.dataAddress !== undefined) {
      dataAddress = new DataAddress({
        endpointType: dataPlaneTransfer.endpointType,
        endpoint: dataPlaneTransfer.dataAddress.endpoint,
        endpointProperties: dataPlaneTransfer.dataAddress.properties.map(
          (p) => new EndpointProperty(p)
        )
      });
      transferRequestMessage.dataAddress = dataAddress;
    }

    const requestTransfer = await this.dsp.requestTransfer(
      `${remoteAddress}/request`,
      transferRequestMessage,
      audience
    );
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    const transfer: TransferDetail = {
      localId: localId,
      remoteId: transferProcess.providerPid,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${transferProcess.providerPid}`,
      remoteParty: audience,
      state: TransferState.REQUESTED,
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      events: [
        this.transferEventRepository.create({
          time: new Date(),
          state: TransferState.REQUESTED,
          type: "local"
        })
      ],
      modifiedDate: new Date()
    };
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:create", transfer.localId);
    }
    return {
      localId,
      remoteId: transferProcess.providerPid,
      message: transferRequestMessage,
      process: transferProcess
    };
  }

  async handleRequest(
    transferRequestMessage: TransferRequestMessage,
    audience: string,
    verifiableCredentials: VerifiableCredential[]
  ): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      providerPid: `urn:uuid:provider:${crypto.randomUUID()}`,
      consumerPid: transferRequestMessage.consumerPid,
      state: TransferState.REQUESTED,
      agreementId: transferRequestMessage.agreementId
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(
      transferRequestMessage,
      transferProcess.providerPid,
      "provider",
      audience,
      undefined
    );
    const transfer: TransferDetail = {
      localId: transferProcess.providerPid,
      remoteId: transferRequestMessage.consumerPid,
      role: "provider",
      remoteAddress: transferRequestMessage.callbackAddress,
      remoteParty: audience,
      state: TransferState.REQUESTED,
      agreementId: transferRequestMessage.agreementId,
      format: transferRequestMessage.format,
      dataAddress: transferRequestMessage.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      events: [
        this.transferEventRepository.create({
          time: new Date(),
          state: TransferState.REQUESTED,
          type: "remote"
        })
      ],
      modifiedDate: new Date()
    };
    const context = await this.policyEvaluationService.initializeContext(
      transferRequestMessage.agreementId,
      "provider",
      EvaluationTrigger.PROVIDER_ON_REQUEST,
      transferProcess.providerPid,
      audience,
      ODRLAction.USE,
      verifiableCredentials
    );
    const evaluation = await this.policyEvaluationService.evaluate(context);
    if (evaluation.decision === "DENY") {
      throw new DSPError(
        {
          message: `Policy evaluation denied transfer request`,
          evaluation: evaluation
        },
        HttpStatus.FORBIDDEN
      );
    }
    await this.transferDetailRepository.save(transfer);
    if (dataPlaneTransfer.dataAddress) {
      this.start(
        transferProcess.providerPid,
        dataPlaneTransfer.dataAddress,
        false
      );
    }
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:create", transfer.localId);
    }
    return transferProcess;
  }

  async start(
    processId: string,
    dataPlaneAddress: DataPlaneAddressDto | undefined,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    let dataAddress: DataAddress | undefined;
    if (dataPlaneAddress && dataPlaneAddress.endpoint) {
      dataAddress = new DataAddress({
        endpoint: dataPlaneAddress.endpoint,
        endpointType: transfer.dataPlaneTransfer.endpointType,
        endpointProperties: toArray(dataPlaneAddress.properties).map(
          (p) => new EndpointProperty(p)
        )
      });
    } else {
      dataAddress = new DataAddress({
        endpoint: transfer.dataAddress?.endpoint || "",
        endpointType: transfer.dataAddress?.endpointType || "",
        endpointProperties:
          transfer.dataAddress?.endpointProperties?.map(
            (p) => new EndpointProperty(p)
          ) || []
      });
    }
    const transferStartMessage = new TransferStartMessage({
      providerPid: this.mapId(transfer, "providerPid"),
      consumerPid: this.mapId(transfer, "consumerPid"),
      dataAddress: dataAddress
    });
    await this.checkTransition("local", transfer, TransferState.STARTED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: "local"
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.startTransfer(
        transfer.dataPlaneTransfer,
        transferStartMessage
      );
    }
    await this.dsp.startTransfer(
      `${transfer.remoteAddress}/start`,
      transferStartMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async handleStart(
    processId: string,
    transferStartMessage: TransferStartMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.STARTED);
    this.processIdMatch(
      transferStartMessage.consumerPid,
      transferStartMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: "remote"
      })
    );
    await this.dataPlaneService.startTransfer(
      transfer.dataPlaneTransfer,
      transferStartMessage
    );
    if (transferStartMessage.dataAddress) {
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async complete(
    processId: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.COMPLETED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: "local"
      })
    );
    const transferCompletionMessage = new TransferCompletionMessage({
      providerPid: this.mapId(transfer, "providerPid"),
      consumerPid: this.mapId(transfer, "consumerPid")
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.completeTransfer(
        transfer.dataPlaneTransfer,
        transferCompletionMessage
      );
    }
    await this.dsp.completeTransfer(
      `${transfer.remoteAddress}/complete`,
      transferCompletionMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async handleComplete(
    processId: string,
    transferCompletionMessage: TransferCompletionMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.COMPLETED);
    this.processIdMatch(
      transferCompletionMessage.consumerPid,
      transferCompletionMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: "remote"
      })
    );
    await this.dataPlaneService.completeTransfer(
      transfer.dataPlaneTransfer,
      transferCompletionMessage
    );

    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async terminate(
    processId: string,
    code: string,
    reason: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.TERMINATED);
    const transferTerminationMessage = new TransferTerminationMessage({
      providerPid: this.mapId(transfer, "providerPid"),
      consumerPid: this.mapId(transfer, "consumerPid"),
      code: code,
      reason: [new Multilanguage(reason)]
    });
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: code,
        reason: transferTerminationMessage.reason,
        type: "local"
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.terminateTransfer(
        transfer.dataPlaneTransfer,
        transferTerminationMessage
      );
    }
    await this.dsp.terminateTransfer(
      `${transfer.remoteAddress}/terminate`,
      transferTerminationMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async handleTerminate(
    processId: string,
    transferTerminationMessage: TransferTerminationMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.TERMINATED);
    this.processIdMatch(
      transferTerminationMessage.consumerPid,
      transferTerminationMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: transferTerminationMessage.code,
        reason: transferTerminationMessage.reason,
        type: "remote"
      })
    );
    await this.dataPlaneService.terminateTransfer(
      transfer.dataPlaneTransfer,
      transferTerminationMessage
    );

    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  mapId(transfer: TransferDetail, id: "providerPid" | "consumerPid"): string {
    switch (id) {
      case "providerPid":
        return transfer.role === "provider"
          ? transfer.localId
          : transfer.remoteId!;
      case "consumerPid":
        return transfer.role === "provider"
          ? transfer.remoteId!
          : transfer.localId;
    }
  }

  async suspend(
    processId: string,
    reason: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.SUSPENDED);
    const transferSuspensionMessage = new TransferSuspensionMessage({
      providerPid: this.mapId(transfer, "providerPid"),
      consumerPid: this.mapId(transfer, "consumerPid"),
      reason: [new Multilanguage(reason)]
    });
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: "local"
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.suspendTransfer(
        transfer.dataPlaneTransfer,
        transferSuspensionMessage
      );
    }
    await this.dsp.suspendTransfer(
      `${transfer.remoteAddress}/suspend`,
      transferSuspensionMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  async handleSuspend(
    processId: string,
    transferSuspensionMessage: TransferSuspensionMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.SUSPENDED);
    this.processIdMatch(
      transferSuspensionMessage.consumerPid,
      transferSuspensionMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: "remote"
      })
    );
    await this.dataPlaneService.suspendTransfer(
      transfer.dataPlaneTransfer,
      transferSuspensionMessage
    );
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    if (this.runtime.controlPlaneInteractions === "manual") {
      this.dspGateway.sendUpdateToClients("transfer:update", transfer.localId);
    }
    return {
      status: "OK"
    };
  }

  private processIdMatch(
    consumerPid: string,
    providerPid: string,
    transfer: TransferDetail
  ) {
    if (transfer.role == "consumer") {
      if (
        consumerPid !== transfer.localId ||
        providerPid !== transfer.remoteId
      ) {
        throw new DSPError(
          "Mismatch in received and stored process identifiers",
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "warn");
      }
    } else {
      if (
        providerPid !== transfer.localId ||
        consumerPid !== transfer.remoteId
      ) {
        throw new DSPError(
          "Mismatch in received and stored process identifiers",
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "warn");
      }
    }
  }
}
