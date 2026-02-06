import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, Paginated, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { UserDto, UserWithPasswordDto } from "@tsg-dsp/sso-bridge-dtos";
import { compare, hash } from "bcrypt";
import { Request } from "express";
import { Repository } from "typeorm";

import { TwoFactorHelper } from "../auth/two-factor.helper.js";
import { InitUser, RootConfig } from "../config.js";
import { OauthUser } from "../model/user.dao.js";
import { PermissionsService } from "../permissions/permissions.service.js";
import { OwnershipFields } from "../utils/ownership.js";
import { getUser } from "../utils/session.js";
import { oauthUserToDto } from "../utils/user.js";

@Injectable()
export class UsersService {
  constructor(
    private readonly rootConfig: RootConfig,
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>,
    private readonly permissionsService: PermissionsService,
    private readonly twoFactorHelper: TwoFactorHelper
  ) {
    this.initialized = this.init();
  }
  private readonly logger: Logger = new Logger(this.constructor.name);
  initialized: Promise<void>;

  async init() {
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

  async getUsers(
    paginationOptions: PaginationOptionsDto
  ): Promise<Paginated<UserDto[]>> {
    const [data, total] = await this.userRepository.findAndCount({
      ...paginationOptions.typeOrm
    });
    return {
      data: data.map(oauthUserToDto),
      total
    };
  }

  async getUser(userId: string): Promise<OauthUser> {
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

  async has2FACredentials(userId: string): Promise<boolean> {
    return await this.twoFactorHelper.has2FACredentials(userId);
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

  async createUser(
    createUserData: Partial<UserWithPasswordDto>,
    ownershipFields?: OwnershipFields
  ): Promise<OauthUser> {
    const user = this.userRepository.create({
      ...this.fromUserInput(createUserData),
      ...ownershipFields
    });
    user.password = await hash(user.password, 10);
    return await this.userRepository.save(user);
  }

  /**
   * Transforms permissions from string[] (which may include permission set names)
   * to expanded permission strings.
   */
  fromUserInput(
    userData: Partial<InitUser> | Partial<UserWithPasswordDto>
  ): Partial<OauthUser> {
    return {
      ...userData,
      permissions: this.permissionsService.expandPermissions(
        userData.permissions || []
      )
    } as Partial<OauthUser>;
  }

  async deleteUser(
    id: string,
    request: Request
  ): Promise<{ deleted: boolean }> {
    const currentUser = getUser(request);
    if (currentUser && id === currentUser.id) {
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
    id: string,
    updateData: Partial<UserWithPasswordDto>
  ): Promise<OauthUser> {
    const user = await this.getUser(id);
    if (updateData.password) {
      updateData.password = await hash(updateData.password, 10);
    }
    const transformedData = this.fromUserInput(updateData);

    return await this.userRepository.save(
      this.userRepository.create({
        ...user,
        ...transformedData
      })
    );
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

  async getUserProfile(request: Request) {
    const currentUser = getUser(request);
    if (!currentUser) {
      throw new AppError("Not authenticated", HttpStatus.UNAUTHORIZED);
    }
    const user = await this.getUser(currentUser.id);
    const has2FA = await this.has2FACredentials(user.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      permissions: user.permissions || [],
      require2FA: user.require2FA,
      has2FA
    };
  }

  async changePassword(
    request: Request,
    currentPassword: string,
    newPassword: string
  ) {
    const currentUser = getUser(request);
    if (!currentUser) {
      throw new AppError("Not authenticated", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.getUser(currentUser.id);
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError(
        "Current password is incorrect",
        HttpStatus.BAD_REQUEST
      );
    }

    user.password = await hash(newPassword, 10);
    await this.userRepository.save(user);
    return { success: true };
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return await compare(password, user.password);
  }

  async setRequire2FA(userId: string, require2FA: boolean): Promise<void> {
    const user = await this.getUser(userId);
    user.require2FA = require2FA;
    await this.userRepository.save(user);
  }

  async resetUser2FA(userId: string): Promise<void> {
    const user = await this.getUser(userId);

    const has2FA = await this.has2FACredentials(user.id);
    if (!has2FA) {
      throw new AppError(
        "User does not have 2FA enabled",
        HttpStatus.BAD_REQUEST
      );
    }

    await this.twoFactorHelper.deleteAll2FACredentials(user.id);
  }
}
