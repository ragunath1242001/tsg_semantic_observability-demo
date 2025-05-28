import {
  CatalogService,
  DataPlaneService,
  NegotiationService,
  TransferService
} from "@apps/control-plane-api";
import { AgreementService } from "@apps/control-plane-api/dist/policy/agreement.service.js";
import { Logger } from "@nestjs/common";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";
import {
  ContractNegotiationState,
  Dataset,
  defaultContext,
  Distribution,
  NegotiationDetail,
  Offer,
  Permission,
  TransferDetail,
  TransferState
} from "@tsg-dsp/common-dsp";

import {
  BaseHandler,
  EventHandler,
  NegotiationHandler,
  PipelineExecute,
  TransferHandler
} from "./types.js";

export class Pipeline implements PipelineExecute {
  constructor(
    private readonly id: string,
    private readonly agreementId: string | undefined,
    private readonly assigner: string | undefined,
    private readonly assignee: string | undefined,
    readonly catalogService: CatalogService,
    readonly negotiationService: NegotiationService,
    readonly transferService: TransferService,
    readonly dataPlaneService: DataPlaneService
  ) {
    this.logger = new Logger(this.id);
  }
  protected readonly logger: Logger;
  private setupHandler?: BaseHandler;
  private readonly eventHandlers: EventHandler[] = [];
  private completeHandler?: BaseHandler;

  async init() {
    const dataset = new Dataset({
      id: `${this.id}`,
      distribution: [
        new Distribution({
          id: `${this.id}-dataset`,
          format: "HttpData-PULL"
        })
      ],
      hasPolicy: [
        new Offer({
          id: `CD123:${this.id}:456`,
          assigner: this.assigner ?? "did:web:localhost%3A32490",
          permission: [
            new Permission({
              action: "use"
            })
          ]
        })
      ]
    });

    if (!this.agreementId) {
      this.logger.log(
        "No agreement ID provided, skipping agreement initialization"
      );
      await this.catalogService.addDataset(dataset);
      return;
    }
    const dataplanes = await this.dataPlaneService.getDataPlanes(
      PaginationOptionsDto.NO_PAGINATION
    );
    const providerDataplane = dataplanes.data.find(
      (dp) => dp.role === "provider"
    );
    if (!providerDataplane) {
      this.logger.log(
        "No provider dataplane found, skipping dataset initialization via dataplane"
      );
      await this.catalogService.addDataset(dataset);
    } else {
      this.logger.log(
        `Adding dataset to provider dataplane ${providerDataplane.identifier}`
      );
      await this.dataPlaneService.addDataset(
        providerDataplane.identifier,
        dataset
      );
    }
    const agreementService: AgreementService =
      this.negotiationService["agreementService"];
    await agreementService.storeAgreement(
      {
        "@context": defaultContext(),
        "@id": this.agreementId,
        "@type": "Agreement",
        assignee: this.assignee ?? "did:web:localhost%3A32490",
        assigner: this.assigner ?? "did:web:localhost%3A32490",
        target: `${this.id}`,
        timestamp: new Date().toISOString(),
        permission: [
          {
            "@type": "Permission",
            action: "use"
          }
        ]
      },
      this.agreementId,
      undefined,
      undefined
    );
  }

  async execute() {
    this.logger.log("Executing pipeline");
    await this.init();
    if (this.setupHandler) {
      await this.setupHandler({
        catalogService: this.catalogService,
        negotiationService: this.negotiationService,
        transferService: this.transferService,
        logger: this.logger
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    await Promise.all([...this.eventHandlers.map((handler) => handler.result)]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (this.completeHandler) {
      await this.completeHandler({
        catalogService: this.catalogService,
        negotiationService: this.negotiationService,
        transferService: this.transferService,
        logger: this.logger
      });
    }
    this.logger.log("Pipeline executed");
  }

  onSetup(handler: BaseHandler): PipelineExecute {
    this.setupHandler = handler;
    return this;
  }

  onComplete(handler: BaseHandler): PipelineExecute {
    this.completeHandler = handler;
    return this;
  }

  onEvent(
    event: "negotiation" | "transfer",
    role: "provider" | "consumer",
    state: ContractNegotiationState | TransferState,
    handler: NegotiationHandler | TransferHandler
  ): PipelineExecute {
    let resultResolver: (v: void) => void;
    let rejectResolver: (v: void) => void;
    const result: Promise<void> = new Promise((resolve, reject) => {
      resultResolver = resolve;
      rejectResolver = reject;
    });
    this.eventHandlers.push({
      event,
      role,
      state,
      started: false,
      result: result,
      resolve: resultResolver!,
      reject: rejectResolver!,
      handler
    });
    return this;
  }

  async handleNegotiationEvent(negotiation: NegotiationDetail): Promise<void> {
    const handler = this.eventHandlers.find((h) => !h.started);
    if (
      handler &&
      handler.event === "negotiation" &&
      handler.role === negotiation.role &&
      handler.state === negotiation.state
    ) {
      handler.started = true;
      setTimeout(() => {
        handler.result = this.linkPromise(
          (handler.handler as NegotiationHandler)({
            negotiation,
            catalogService: this.catalogService,
            negotiationService: this.negotiationService,
            transferService: this.transferService,
            logger: this.logger
          }),
          handler
        );
      }, 10);
    } else {
      this.logger.debug(
        `No handler found for negotiation event for role ${negotiation.role} in state ${negotiation.state}`
      );
    }
  }

  async handleTransferEvent(transfer: TransferDetail): Promise<void> {
    const handler = this.eventHandlers.find((h) => !h.started);
    if (
      handler &&
      handler.event === "transfer" &&
      handler.role === transfer.role &&
      handler.state === transfer.state
    ) {
      setTimeout(() => {
        handler.started = true;
        handler.result = this.linkPromise(
          (handler.handler as TransferHandler)({
            transfer,
            catalogService: this.catalogService,
            negotiationService: this.negotiationService,
            transferService: this.transferService,
            logger: this.logger
          }),
          handler
        );
      }, 10);
    } else {
      this.logger.debug(
        `No handler found for negotiation event for role ${transfer.role} in state ${transfer.state}`
      );
    }
  }

  private linkPromise(
    promise: Promise<void>,
    handler: EventHandler
  ): Promise<void> {
    promise
      .then(() => {
        handler.resolve();
      })
      .catch((e) => {
        handler.reject(e);
      });
    return promise;
  }
}
