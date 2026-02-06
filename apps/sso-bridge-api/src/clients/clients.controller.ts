import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  PaginationOptionsDto,
  PaginationQuery,
  Requires,
  UsePagination
} from "@tsg-dsp/common-api";
import { Action, Resource } from "@tsg-dsp/common-dtos";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";
import { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { getOwnershipFieldsFromSession } from "../utils/ownership.js";
import { ClientsService } from "./clients.service.js";

@ApiTags("Clients")
@Controller("clients")
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @Requires(Action.READ, Resource.SSO_CLIENT)
  @UsePagination()
  @ApiOperation({ summary: "Retrieve all clients" })
  @ApiResponse({
    status: 200,
    description: "List of clients returned successfully."
  })
  async getClients(@PaginationQuery() paginationOptions: PaginationOptionsDto) {
    const result = await this.clientsService.getClients(paginationOptions);
    const transformedData = result.data.map((client) => ({
      ...client,
      permissions: client.permissions || []
    }));
    return { data: transformedData, total: result.total };
  }

  @Post("create")
  @Requires(Action.CREATE, Resource.SSO_CLIENT)
  @ApiOperation({ summary: "Create a new client" })
  @ApiBody({ type: ClientDto, description: "Data for the new client" })
  @ApiResponse({ status: 201, description: "Client created successfully." })
  async createUser(
    @Body() createClientDto: Partial<ClientDto>,
    @Req() request: Request
  ) {
    const ownershipFields = getOwnershipFieldsFromSession(request);
    return await this.clientsService.createClient(
      createClientDto,
      ownershipFields
    );
  }

  @Delete(":id")
  @Requires(Action.DELETE, Resource.SSO_CLIENT)
  @ApiOperation({ summary: "Delete a client by id" })
  @ApiResponse({ status: 200, description: "Client deleted successfully." })
  async deleteClient(@Param("id") id: string) {
    return this.clientsService.deleteClient(id);
  }

  @Patch("update/:id")
  @Requires(Action.UPDATE, Resource.SSO_CLIENT)
  @ApiOperation({ summary: "Update an existing client" })
  @ApiBody({ type: ClientDto, description: "Updated client data" })
  @ApiResponse({ status: 200, description: "Client updated successfully." })
  async updateClient(
    @Param("id") id: string,
    @Body() updateClientDto: Partial<ClientDto>
  ) {
    return this.clientsService.updateClient(id, updateClientDto);
  }
}
