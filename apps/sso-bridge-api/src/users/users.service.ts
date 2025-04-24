import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { compare, hash } from "bcrypt";
import { Request } from "express";
import { Repository } from "typeorm";

import { InitUser, RootConfig } from "../config.js";
import { OauthUser } from "../model/user.dao.js";
import { RolesService } from "../roles/roles.service.js";
import { getUser } from "../utils/session.js";

@Injectable()
export class UsersService {
  constructor(
    private readonly rootConfig: RootConfig,
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>,
    private readonly rolesService: RolesService,
    @Inject(REQUEST) private readonly request: Request
  ) {
    this.initialized = this.init();
  }
  private readonly logger: Logger = new Logger(this.constructor.name);
  initialized: Promise<void>;

  async init() {
    await this.rolesService.initialized;

    // Skip if no users to initialize or users already exist
    if (
      !this.rootConfig.initUsers.length ||
      (await this.userRepository.count()) > 0
    ) {
      return;
    }

    await Promise.allSettled(
      this.rootConfig.initUsers.map(async (user) => {
        try {
          const createdUser = await this.createUser(user);
          this.logger.log(`Initialized user: ${createdUser.username}`);
          return createdUser;
        } catch (error) {
          this.logger.error(
            `Failed to initialize user: ${user.username}`,
            error
          );
          throw error;
        }
      })
    );
  }

  async getUsers(paginationOptions: PaginationOptionsDto) {
    const [data, total] = await this.userRepository.findAndCount({
      ...paginationOptions.typeOrm
    });
    return {
      data,
      total
    };
  }

  async getUser(userId: number): Promise<OauthUser> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) {
      throw new AppError(
        `User with id ${userId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<OauthUser> {
    const user = await this.userRepository.findOne({
      where: { email }
    });
    if (!user) {
      throw new AppError(
        `User with email ${email} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return user;
  }

  async createUser(createUserData: Partial<UserDto>): Promise<OauthUser> {
    const user = this.userRepository.create(
      await this.fromUserInput(createUserData)
    );
    user.password = await hash(user.password, 10);
    return await this.userRepository.save(user);
  }

  /**
   * Transforms roles from string[] to OauthRole[] objects.
   */
  async fromUserInput(
    userData: Partial<InitUser> | Partial<UserDto>
  ): Promise<OauthUser> {
    return {
      ...userData,
      roles: await this.rolesService.getRolesByNames(userData.roles || [])
    } as OauthUser;
  }

  async deleteUser(id: number): Promise<{ deleted: boolean }> {
    const currentUser = getUser(this.request);
    if (currentUser && +id === +currentUser.id) {
      throw new AppError(
        "You cannot delete your own account",
        HttpStatus.FORBIDDEN
      );
    }
    const user = await this.getUser(id);
    await this.userRepository.remove(user);
    return { deleted: true };
  }

  async updateUser(
    id: number,
    updateData: Partial<UserDto>
  ): Promise<OauthUser> {
    const user = await this.getUser(id);
    if (updateData.password) {
      updateData.password = await hash(updateData.password, 10);
    }
    return await this.userRepository.save({
      ...user,
      ...(await this.fromUserInput(updateData))
    });
  }

  async validateUser(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username }
    });
    if (!user) {
      throw new AppError(
        "Invalid username or password",
        HttpStatus.UNAUTHORIZED
      );
    }
    const isValid = await compare(password, user.password);
    if (!isValid) {
      throw new AppError(
        "Invalid username or password",
        HttpStatus.UNAUTHORIZED
      );
    }
    return user;
  }
}
