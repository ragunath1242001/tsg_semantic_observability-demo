import { HttpStatus, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { DSPError } from "../utils/errors/error";
import { BasicStrategy } from "passport-http";
import { RootConfig } from "../config";
import bcrypt from "bcrypt";

@Injectable()
export class ManagementStrategy extends PassportStrategy(
  BasicStrategy,
  "mgmt"
) {
  constructor(
    private readonly authService: AuthService,
    private readonly config: RootConfig
  ) {
    super();
  }

  async validate(username: string, password: string) {
    const user = this.config.users.find((user) => user.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new DSPError(
        "Unknown user / password combination",
        HttpStatus.UNAUTHORIZED
      );
    }

    return { username: user.username };
  }
}
