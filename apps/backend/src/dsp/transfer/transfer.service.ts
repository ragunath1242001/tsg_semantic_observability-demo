import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import { DataPlaneAddressDto } from "@libs/dtos"
import { Multilanguage } from "../../model/dsp/common"
import { DataAddress, EndpointProperty, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages"
import { TransferState } from "@tsg-dsp/common"
import { DataPlaneService } from "../../data-plane/dataPlane.service"
import crypto from "crypto"
import { DspClientService } from "../client/client.service"
import { deserialize } from "../../model/serialize"
import { DSPError } from "../../utils/errors/error"
import { ServerConfig } from "../../config"
import { TransferEventDao, TransferDetailDao, TransferRole } from "../../model/dsp/transfer/transfer.dao"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { TransferDetail, TransferEvent, TransferStatus } from "../../model/dsp/transfer/transfer"


@Injectable()
export class TransferService {
  constructor(
    private readonly dataPlaneService: DataPlaneService, 
    private readonly dsp: DspClientService, 
    private readonly server: ServerConfig,
    @InjectRepository(TransferDetailDao) private readonly transferDetailRepository: Repository<TransferDetailDao>,
    @InjectRepository(TransferEventDao) private readonly transferEventRepository: Repository<TransferEventDao>) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly providerTransitions: Record<TransferState, TransferState[]> = {
    [TransferState.REQUESTED]: [TransferState.STARTED, TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED, TransferState.TERMINATED]
  }

  private readonly consumerTransitions: Record<TransferState, TransferState[]> = {
    [TransferState.REQUESTED]: [TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED, TransferState.TERMINATED]
  }

  private readonly allowedTransitions: Record<"remote" | "local", Record<TransferRole, Record<TransferState, TransferState[]>>> = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions
    }
  }

  private async checkTransition(direction: "remote" | "local", transfer: TransferDetail, to: TransferState) {
    if (!this.allowedTransitions[direction][transfer.role][transfer.state].includes(to)) {
      const event: TransferEvent = {
        time: new Date(),
        state: to,
        localMessage: `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`,
        type: direction
      }
      const eventObj = this.transferEventRepository.create(event);
      transfer.events.push(eventObj);
      await this.transferDetailRepository.save(transfer);
      throw new DSPError(`Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getTransfers(): Promise<TransferStatus[]> {
    const transfers = await this.transferDetailRepository.find({
      select: {
        localId: true,
        remoteId: true,
        role: true,
        remoteAddress: true,
        remoteParty: true,
        state: true,
        process: {
          processId: true,
          transferState: true,
        },
        agreementId: true,
        format: true
      }
    })
    return transfers.map(transfer => new TransferStatus(transfer));
  }

  async getTransfer(processId: string, audience?: string): Promise<TransferDetail> {
    const transfer = await this.transferDetailRepository.findOneBy({
      localId: processId,
      remoteParty: audience
    });
    if (transfer) {
      return new TransferDetail(transfer)
    } else {
      throw new DSPError(`Cannot get transfer with process ID ${processId}`, HttpStatus.NOT_FOUND)
    }
  }

  async initiateTransferProcess(agreementId: string, format: string, dataAddress: DataAddress | undefined, remoteAddress: string, audience: string): Promise<{localId: string, message: TransferRequestMessage, process: TransferProcess}> {
    const localId = `urn:uuid:consumer:${crypto.randomUUID()}`;
    const transferRequestMessage = new TransferRequestMessage({
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      callbackAddress: `${this.server.publicAddress}/transfer/${localId}`
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, localId, "consumer");
    const requestTransfer = await this.dsp.requestTransfer(`${remoteAddress}/request`, transferRequestMessage, audience);
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    if (dataAddress === undefined && dataPlaneTransfer.dataAddress !== undefined) {
      dataAddress = new DataAddress({
        endpointType: dataPlaneTransfer.endpointType,
        endpoint: dataPlaneTransfer.dataAddress.endpoint,
        endpointProperties: dataPlaneTransfer.dataAddress.properties.map(p => new EndpointProperty(p))
      })
    }
    const transfer: TransferDetail = {
      localId: localId,
      remoteId: transferProcess.processId,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${transferProcess.processId}`,
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
          type: 'local'
        })
      ]
    }
    await this.transferDetailRepository.save(transfer);
    return {
      localId,
      message: transferRequestMessage,
      process: transferProcess
    };
  }

  async handleRequest(transferRequestMessage: TransferRequestMessage, audience: string): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      processId: `urn:uuid:provider:${crypto.randomUUID()}`,
      transferState: TransferState.REQUESTED
    })
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, transferProcess.processId, "provider");
    const transfer: TransferDetail = {
      localId: transferProcess.processId,
      remoteId: transferRequestMessage.callbackAddress.split("/").slice(-1)[0],
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
          type: 'remote'
        })
      ]
    }
    await this.transferDetailRepository.save(transfer);
    if (dataPlaneTransfer.dataAddress) {
      setTimeout(() => {
        this.start(transferProcess.processId, dataPlaneTransfer.dataAddress, false);
      }, 2000);
    }
    return transferProcess;
  }

  async start(processId: string, dataPlaneAddress: DataPlaneAddressDto | undefined, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    let dataAddress: DataAddress | undefined;
    if (dataPlaneAddress) {
      dataAddress = new DataAddress({
        endpoint: dataPlaneAddress.endpoint,
        endpointType: transfer.dataPlaneTransfer.endpointType,
        endpointProperties: dataPlaneAddress.properties?.map(p => new EndpointProperty(p)) || []
      });
    }
    const transferStartMessage = new TransferStartMessage({
      processId: transfer.remoteId!,
      dataAddress: dataAddress
    })
    await this.checkTransition("local", transfer, TransferState.STARTED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: 'local'
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)
    }
    await this.dsp.startTransfer(`${transfer.remoteAddress}/start`, transferStartMessage, transfer.remoteParty);
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }


  async handleStart(processId: string, transferStartMessage: TransferStartMessage, audience: string): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.STARTED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: 'remote'
      })
    );
    await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)
    if (transferStartMessage.dataAddress) {
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }

  async complete(processId: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.COMPLETED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: 'local'
      })
    );
    const transferCompletionMessage = new TransferCompletionMessage({
      processId: transfer.remoteId!
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)
    }
    await this.dsp.completeTransfer(`${transfer.remoteAddress}/complete`, transferCompletionMessage, transfer.remoteParty);
    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }
  
  async handleComplete(processId: string, transferCompletionMessage: TransferCompletionMessage, audience: string): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.COMPLETED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: 'remote'
      })
    );
    await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)

    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }
  
  async terminate(processId: string, code: string, reason: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.TERMINATED);
    const transferTerminationMessage = new TransferTerminationMessage({
      processId: transfer.remoteId!,
      code: code,
      reason: [new Multilanguage(reason)]
    });
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: code,
        reason: transferTerminationMessage.reason,
        type: 'local'
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)
    }
    await this.dsp.terminateTransfer(`${transfer.remoteAddress}/terminate`, transferTerminationMessage, transfer.remoteParty);
    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }
  
  async handleTerminate(processId: string, transferTerminationMessage: TransferTerminationMessage, audience: string): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.TERMINATED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: transferTerminationMessage.code,
        reason: transferTerminationMessage.reason,
        type: 'remote'
      })
    );
    await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)

    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }

  async suspend(processId: string, reason: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.SUSPENDED);
    const transferSuspensionMessage = new TransferSuspensionMessage({
      processId: transfer.remoteId!,
      reason: [new Multilanguage(reason)]
    })
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: 'local'
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)
    }
    await this.dsp.suspendTransfer(`${transfer.remoteAddress}/suspend`, transferSuspensionMessage, transfer.remoteParty);
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }

  async handleSuspend(processId: string, transferSuspensionMessage: TransferSuspensionMessage, audience: string): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.SUSPENDED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: 'remote'
      })
    );
    await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    return {
      status: 'OK'
    }
  }
}