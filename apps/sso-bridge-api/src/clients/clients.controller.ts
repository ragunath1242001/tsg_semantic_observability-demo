import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { ClientsService } from "./clients.service.js";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos";

@ApiTags("Clients")
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve all clients" })
  @ApiResponse({
    status: 200,
    description: "List of clients returned successfully."
  })
  async getClients() {
    return await this.clientsService.getClients();
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
