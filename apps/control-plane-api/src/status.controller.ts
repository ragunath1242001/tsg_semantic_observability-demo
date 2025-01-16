import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NegotiationDetailDao } from "./model/negotiation.dao.js";
import { TransferDetailDao } from "./model/transfer.dao.js";
import {
  ContractNegotiationState,
  NegotiationRole,
  TransferRole,
  TransferState
} from "@tsg-dsp/common-dsp";
import { StatusDto } from "@tsg-dsp/control-plane-dtos";
import { getHeapStatistics } from "v8";
import { OAuthGuard } from "@tsg-dsp/common-api";

@Controller()
@ApiTags("Status")
@UseGuards(OAuthGuard)
export class StatusController {
  constructor(
    private readonly db: TypeOrmHealthIndicator,
    @InjectRepository(NegotiationDetailDao)
    private readonly negotiationDetailRepository: Repository<NegotiationDetailDao>,
    @InjectRepository(TransferDetailDao)
    private readonly transferDetailRepository: Repository<TransferDetailDao>
  ) {}
  @Get("/status")
  @ApiOperation({
    summary: "Application status",
    description:
      "Retrieves the current health of the control plane. With additional status information"
  })
  @ApiBody({ type: StatusDto })
  @ApiOkResponse()
  @ApiBadGatewayResponse()
  async getStatus() {
    const database = await this.db.pingCheck("database", { timeout: 300 });
    if (database.database.status !== "up") {
      return {
        ...database,
        uptime: process.uptime(),
        memoryUsage: getHeapStatistics(),
        negotiations: [],
        transfers: []
      };
    }
    const negotiationState = [
      ContractNegotiationState.REQUESTED,
      ContractNegotiationState.OFFERED,
      ContractNegotiationState.ACCEPTED,
      ContractNegotiationState.AGREED,
      ContractNegotiationState.VERIFIED,
      ContractNegotiationState.FINALIZED,
      ContractNegotiationState.TERMINATED
    ];
    const negotiationRoles: NegotiationRole[] = ["provider", "consumer"];
    const negotiations = await Promise.all(
      negotiationRoles.flatMap((role) =>
        negotiationState.map(async (state) => {
          return {
            role,
            state,
            count: await this.negotiationDetailRepository.countBy({
              state,
              role
            })
          };
        })
      )
    );
    const transferStates = [
      TransferState.REQUESTED,
      TransferState.STARTED,
      TransferState.COMPLETED,
      TransferState.SUSPENDED,
      TransferState.TERMINATED
    ];
    const transferRoles: TransferRole[] = ["provider", "consumer"];
    const transfers = await Promise.all(
      transferRoles.flatMap((role) =>
        transferStates.map(async (state) => {
          return {
            role,
            state,
            count: await this.transferDetailRepository.countBy({
              state,
              role
            })
          };
        })
      )
    );
    return {
      ...database,
      uptime: process.uptime(),
      memoryUsage: getHeapStatistics(),
      negotiations,
      transfers
    };
  }
}
