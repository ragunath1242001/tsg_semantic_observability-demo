import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusDto } from "@tsg-dsp/wallet-dtos";
import { IsNull, Not, Repository } from "typeorm";
import { getHeapStatistics } from "v8";

import { CredentialDao, KeyMaterialDao } from "./model/credentials.dao.js";
import { CredentialIssuance } from "./model/issuance.dao.js";

@Controller()
@ApiTags("Status")
export class StatusController {
  constructor(
    private readonly db: TypeOrmHealthIndicator,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    @InjectRepository(CredentialDao)
    private readonly credentialRepository: Repository<CredentialDao>,
    @InjectRepository(KeyMaterialDao)
    private readonly keyRepository: Repository<KeyMaterialDao>
  ) {}
  @Get("/status")
  @ApiOperation({
    summary: "Application status",
    description:
      "Retrieves the current health of the control plane. With additional status information"
  })
  @ApiOkResponse({ type: StatusDto })
  @ApiBadGatewayResponse()
  async getStatus() {
    const database = await this.db.pingCheck("database", { timeout: 300 });
    if (database.database.status !== "up") {
      return {
        ...database,
        uptime: process.uptime(),
        memoryUsage: getHeapStatistics(),
        issuance: {
          issued: 0,
          open: 0
        },
        credentials: {
          selfSigned: 0,
          thirdParty: 0
        },
        keys: 0
      };
    }
    const issuance = {
      issued: await this.issuanceRepository.countBy({
        credentialId: Not(IsNull())
      }),
      open: await this.issuanceRepository.countBy({ credentialId: IsNull() })
    };
    const credentials = {
      selfSigned: await this.credentialRepository.countBy({ selfIssued: true }),
      thirdParty: await this.credentialRepository.countBy({ selfIssued: false })
    };
    const keys = await this.keyRepository.count();
    return {
      ...database,
      uptime: process.uptime(),
      memoryUsage: getHeapStatistics(),
      issuance,
      credentials,
      keys
    };
  }
}
