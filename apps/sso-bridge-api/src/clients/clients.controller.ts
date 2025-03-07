import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  PaginationOptionsDto,
  PaginationQuery,
  UsePagination
} from "@tsg-dsp/common-api";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";

import { AuthGuard, ManagementRoles } from "../auth/auth.guard.js";
import { ClientsService } from "./clients.service.js";

@ApiTags("Clients")
@Controller("clients")
@UseGuards(AuthGuard)
@ManagementRoles("admin")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @UsePagination()
  @ApiOperation({ summary: "Retrieve all clients" })
  @ApiResponse({
    status: 200,
    description: "List of clients returned successfully."
  })
  async getClients(@PaginationQuery() paginationOptions: PaginationOptionsDto) {
    return await this.clientsService.getClients(paginationOptions);
  }

  @Post("create")
  @ApiOperation({ summary: "Create a new client" })
  @ApiBody({ type: ClientDto, description: "Data for the new client" })
  @ApiResponse({ status: 201, description: "Client created successfully." })
  async createUser(@Body() createClientDto: Partial<ClientDto>) {
    return await this.clientsService.createClient(createClientDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a client by id" })
  @ApiResponse({ status: 200, description: "Client deleted successfully." })
  async deleteClient(@Param("id") id: number) {
    return this.clientsService.deleteClient(id);
  }

  @Patch("update/:id")
  @ApiOperation({ summary: "Update an existing client" })
  @ApiBody({ type: ClientDto, description: "Updated client data" })
  @ApiResponse({ status: 200, description: "Client updated successfully." })
  async updateClient(
    @Param("id") id: number,
    @Body() updateClientDto: Partial<ClientDto>
  ) {
    return this.clientsService.updateClient(id, updateClientDto);
  }
}
