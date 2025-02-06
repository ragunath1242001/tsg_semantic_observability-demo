import { HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { OauthUser } from "../model/user.dao.js";
import { AppError } from "@tsg-dsp/common-api";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>
  ) {}

  async getUsers() {
    return await this.userRepository.find();
  }

  async createUser(createUserData: Partial<OauthUser>): Promise<OauthUser> {
    const user = this.userRepository.create(createUserData);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<{ deleted: boolean }> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new AppError(`User with id ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return { deleted: true };
  }

  async updateUser(
    id: number,
    updateData: Partial<OauthUser>
  ): Promise<OauthUser> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new AppError(`User with id ${id} not found`, HttpStatus.NOT_FOUND);
    }
    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }
}
