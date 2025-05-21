import {
  CatalogService,
  NegotiationService,
  TransferService
} from "@apps/control-plane-api";
import { Logger } from "@nestjs/common";
import { PaginationOptionsDto } from "@tsg-dsp/common-api";
import {
  ContractNegotiationState,
  NegotiationDetail,
  TransferDetail,
  TransferState
} from "@tsg-dsp/common-dsp";

export type Events =
  | "negotiation:create"
  | "negotiation:update"
  | "transfer:create"
  | "transfer:update";

export type BaseHandlerContext = {
  catalogService: CatalogService;
  negotiationService: NegotiationService;
  transferService: TransferService;
  logger: Logger;
};

export type BaseHandler = (context: BaseHandlerContext) => Promise<void>;

export type NegotiationHandlerContext = BaseHandlerContext & {
  negotiation: NegotiationDetail;
};

export type NegotiationHandler = (
  context: NegotiationHandlerContext
) => Promise<void>;

export type TransferHandlerContext = BaseHandlerContext & {
  transfer: TransferDetail;
};
export type TransferHandler = (
  context: TransferHandlerContext
) => Promise<void>;

export type EventHandler = {
  event: "negotiation" | "transfer";
  role: "provider" | "consumer";
  state: ContractNegotiationState | TransferState;
  started: boolean;
  result: Promise<void>;
  resolve: (v: void) => void;
  reject: (v: void) => void;
  handler: NegotiationHandler | TransferHandler;
};

export const expectedNegotiationState: (
  state: ContractNegotiationState
) => BaseHandler =
  (state) =>
  async ({ negotiationService }) => {
    const negotiations = await negotiationService.getNegotiations(
      PaginationOptionsDto.NO_PAGINATION
    );
    expect(negotiations.data.length).toBe(2);
    expect(negotiations.data[0].state).toBe(state);
    expect(negotiations.data[1].state).toBe(state);
  };
export const expectedTransferState: (state: TransferState) => BaseHandler =
  (state) =>
  async ({ transferService }) => {
    const transfers = await transferService.getTransfers(
      PaginationOptionsDto.NO_PAGINATION
    );
    expect(transfers.data).toHaveLength(2);
    expect(transfers.data[0].state).toBe(state);
    expect(transfers.data[1].state).toBe(state);
  };

export interface PipelineExecute {
  execute(): Promise<void>;
  onSetup(handler: BaseHandler): PipelineExecute;
  onComplete(handler: BaseHandler): PipelineExecute;
  onEvent(
    event: "negotiation",
    role: "provider" | "consumer",
    state: ContractNegotiationState,
    handler: NegotiationHandler
  ): PipelineExecute;
  onEvent(
    event: "transfer",
    role: "provider" | "consumer",
    state: TransferState,
    handler: TransferHandler
  ): PipelineExecute;
  onEvent(
    event: "negotiation" | "transfer",
    role: "provider" | "consumer",
    state: ContractNegotiationState | TransferState,
    handler: NegotiationHandler | TransferHandler
  ): PipelineExecute;
}
