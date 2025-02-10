import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service.js";
import { Request } from "express";
import { getSession, getUser } from "../utils/session.js";

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async login(username: string, password: string, request: Request) {
    const user = await this.usersService.validateUser(username, password);

    const session = getSession(request);
    if (session) {
      session.user = user;
    }
    return user;
  }

  async logout(request: Request) {
    const session = getSession(request);
    if (session) {
      session.user = undefined;
    }
  }

  async getUser(request: Request) {
    const user = getUser(request);
    if (user) {
      return {
        state: "authenticated",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          grants: user.grants
        }
      };
    } else {
      return {
        state: "unauthenticated"
      };
    }
  }
}
