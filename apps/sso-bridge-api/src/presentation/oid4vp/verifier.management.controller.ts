import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { AuthorizationRequest, validationPipe } from "@tsg-dsp/common-api";
import { ApiForbiddenResponseDefault } from "@tsg-dsp/common-dtos";

import { OID4VPVerifierService } from "./verifier.service.js";

@Controller("management/oid4vp/verifier")
@ApiTags("OID4VP")
export class OID4VPVerifierManagementController {
  constructor(private readonly oid4vpVerifierService: OID4VPVerifierService) {}

  @Get(":id")
  @ApiParam({ name: "id", required: true, type: String })
  @ApiQuery({
    name: "dcql_query_id",
    required: false,
    type: String,
    description: "DCQL query ID to validate against"
  })
  @ApiOperation({
    summary: "Obtain an Authorization Request",
    description:
      "Obtain an Authorization Request according to the OID4VP specification. Optionally specify a DCQL query ID to validate against."
  })
  @ApiOkResponse({ type: String })
  @ApiForbiddenResponseDefault()
  async status(
    @Param("id") id: string,
    @Query(validationPipe) authorizationRequest: AuthorizationRequest,
    @Query("dcql_query_id") dcqlQueryId?: string
  ): Promise<string> {
    return this.oid4vpVerifierService.getOrCreateAuthorizationRequestUrl(
      id,
      authorizationRequest,
      dcqlQueryId
    );
  }
}
