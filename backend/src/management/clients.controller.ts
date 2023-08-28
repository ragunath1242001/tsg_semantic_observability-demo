import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.guard.js";
import { AppRole, ClientSignup } from "../model/clients.dto.js";
import { ClientsService } from "../auth/client.service.js";
import { Clients } from "../model/clients.dao.js";


@Controller('management/clients')
@Roles(AppRole.MANAGE_CLIENTS)
export class ClientsController {
  constructor(private readonly clientService: ClientsService) {}

  @Get()
  async getClients(): Promise<Clients[]> {
    return this.clientService.getClients()
  }

  @Post()
  async addClient(@Body() signup: ClientSignup): Promise<Clients> {
    return await this.clientService.signup(signup, true);
  }

  @Delete(':clientId')
  async remove(@Param('clientId') clientId: string) {
    await this.clientService.remove(clientId);
  }

  @Put(':clientId/activate')
  async activate(@Param('clientId') clientId: string) {
    await this.clientService.activate(clientId);
  }
  @Put(':clientId/deactivate')
  async deactivate(@Param('clientId') clientId: string) {
    await this.clientService.deactivate(clientId);
  }

  @Put(':clientId/roles/:role')
  async addRole(@Param('clientId') clientId: string, @Param('role') role: AppRole) {
    await this.clientService.addRole(role, clientId);
  }
  
  @Delete(':clientId/roles/:role')
  async removeRole(@Param('clientId') clientId: string, @Param('role') role: AppRole) {
    await this.clientService.removeRole(role, clientId);
  }

  @Put(':clientId/did')
  async updateDid(@Param('clientId') clientId: string, @Query('didId') didId: string) {
    await this.clientService.updateDidId(didId, clientId);
  }
}