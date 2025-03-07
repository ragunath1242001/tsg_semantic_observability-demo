import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, PaginationOptionsDto } from "@tsg-dsp/common-api";
import { compare, hash } from "bcrypt";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { OauthUser } from "../model/user.dao.js";

@Injectable()
export class UsersService {
  constructor(
    private readonly rootConfig: RootConfig,
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>
  ) {
    this.initialized = this.init();
  }
  initialized: Promise<void>;

  async init() {
    if (
      this.rootConfig.initUsers.length &&
      (await this.userRepository.count()) === 0
    ) {
      await Promise.allSettled(
        this.rootConfig.initUsers.map(async (client) => {
          await this.createUser(client);
        })
      );
    }
  }

  async getUsers(paginationOptions: PaginationOptionsDto) {
    const [data, total] = await this.userRepository.findAndCount(
      paginationOptions.typeOrm
    );
    return {
      data,
      total
    };
  }

  async getUser(userId: number): Promise<OauthUser> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError(
        `User with id ${userId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<OauthUser> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new AppError(
        `User with email ${email} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return user;
  }

  async createUser(createUserData: Partial<OauthUser>): Promise<OauthUser> {
    const user = this.userRepository.create(createUserData);
    user.password = await hash(user.password, 10);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<{ deleted: boolean }> {
    const user = await this.getUser(id);
    await this.userRepository.remove(user);
    return { deleted: true };
  }

  async updateUser(
    id: number,
    updateData: Partial<OauthUser>
  ): Promise<OauthUser> {
    const user = await this.getUser(id);
    if (updateData.password) {
      updateData.password = await hash(updateData.password, 10);
    }
    return await this.userRepository.save({
      ...user,
      ...updateData
    });
  }

  async validateUser(username: string, password: string) {
    const user = await this.userRepository.findOneBy({ username });
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
