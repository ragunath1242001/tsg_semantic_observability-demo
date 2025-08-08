import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { In, Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthRole } from "../model/role.dao.js";
import { OauthUser } from "../model/user.dao.js";

@Injectable()
export class RolesService {
  constructor(
    private readonly rootConfig: RootConfig,
    @InjectRepository(OauthRole)
    private readonly roleRepository: Repository<OauthRole>,
    @InjectRepository(OauthClient)
    private readonly clientRepository: Repository<OauthClient>,
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>
  ) {
    this.initialized = this.init();
  }
  initialized: Promise<void>;

  async init() {
    // Skip if no roles to initialize or roles already exist
    if (
      !this.rootConfig.initRoles.length ||
      (await this.roleRepository.count()) > 0
    ) {
      return;
    }

    await Promise.all(
      this.rootConfig.initRoles.map(async (role) => {
        const createdRole = await this.getOrCreateRole(role.name, role);
        Logger.log(`Initialized role: ${createdRole.name}`);
      })
    );
  }

  async getBaseUserRoles(): Promise<string[]> {
    return this.roleRepository
      .find({
        where: { isAdminRole: false },
        select: ["name"]
      })
      .then((roles) => roles.map((role) => role.name));
  }

  async getAdminUserRoles(): Promise<string[]> {
    return this.roleRepository
      .find({
        select: ["name"]
      })
      .then((roles) => roles.map((role) => role.name));
  }

  async getRoles(paginationOptions: PaginationOptionsDto) {
    const [data, total] = await this.roleRepository.findAndCount(
      paginationOptions.typeOrm
    );
    return {
      data,
      total
    };
  }

  async getRoleById(roleId: number): Promise<OauthRole> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new AppError(
        `Role with id ${roleId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return role;
  }

  async getRoleByName(roleName: string): Promise<OauthRole> {
    const role = await this.roleRepository.findOneBy({ name: roleName });
    if (!role) {
      throw new AppError(
        `Role with name ${roleName} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return role;
  }

  async getRolesByNames(roleNames: string[]): Promise<OauthRole[]> {
    const roles = await this.roleRepository.findBy({ name: In(roleNames) });
    return roles;
  }

  async getOrCreateRole(
    roleName: string,
    createRoleData: Partial<OauthRole>
  ): Promise<OauthRole> {
    const role = await this.roleRepository.findOneBy({ name: roleName });
    if (role) {
      return role;
    } else {
      return this.createRole(createRoleData);
    }
  }

  async createRole(createRoleData: Partial<OauthRole>): Promise<OauthRole> {
    const role = this.roleRepository.create(createRoleData);
    return await this.roleRepository.save(role);
  }

  async deleteRole(id: number): Promise<{ deleted: boolean }> {
    const role = await this.getRoleById(id);

    const usersWithRole = await this.userRepository.find({
      where: { roles: { id } },
      select: { id: true, username: true }
    });
    if (usersWithRole.length > 0) {
      throw new AppError(
        `Role with id ${id} cannot be deleted because it is assigned to an user`,
        HttpStatus.BAD_REQUEST
      );
    }
    const clientsWithRole = await this.clientRepository.find({
      where: { roles: { id } },
      select: { id: true, clientId: true }
    });
    if (clientsWithRole.length > 0) {
      throw new AppError(
        `Role with id ${id} cannot be deleted because it is assigned to a client`,
        HttpStatus.BAD_REQUEST
      );
    }

    await this.roleRepository.remove(role);
    return { deleted: true };
  }

  async updateRole(
    id: number,
    updateData: Partial<OauthRole>
  ): Promise<OauthRole> {
    const role = await this.getRoleById(id);
    return await this.roleRepository.save({
      ...role,
      ...updateData
    });
  }
}
