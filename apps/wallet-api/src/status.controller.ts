import { Controller, Get } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { CredentialIssuance } from "./model/issuance.dao.js";
import { Credentials, KeyMaterials } from "./model/credentials.dao.js";
import { getHeapStatistics } from "v8";
import { StatusDto } from "@tsg-dsp/wallet-dtos";

@Controller()
@ApiTags("Status")
export class StatusController {
  constructor(
    private readonly db: TypeOrmHealthIndicator,
    @InjectRepository(CredentialIssuance)
    private readonly issuanceRepository: Repository<CredentialIssuance>,
    @InjectRepository(Credentials)
    private readonly credentialRepository: Repository<Credentials>,
    @InjectRepository(KeyMaterials)
    private readonly keyRepository: Repository<KeyMaterials>
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
