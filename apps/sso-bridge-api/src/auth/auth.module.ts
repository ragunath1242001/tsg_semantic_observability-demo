import { forwardRef, Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { KeyDao } from "../model/keys.dao.js";
import { RecoveryCode } from "../model/recovery-code.dao.js";
import { TokenDao } from "../model/token.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { RecoveryCodeController } from "./recovery-code.controller.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TokenService } from "./token.service.js";
import { TotpController } from "./totp.controller.js";
import { TotpService } from "./totp.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";
import { WebAuthnController } from "./webauthn.controller.js";
import { WebAuthnService } from "./webauthn.service.js";

@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([
      KeyDao,
      TokenDao,
      RecoveryCode,
      TotpCredential,
      WebAuthnCredential
    ])
  ],
  controllers: [
    AuthController,
    TotpController,
    WebAuthnController,
    RecoveryCodeController
  ],
  providers: [
    AuthService,
    AuthGuard,
    TokenService,
    TotpService,
    RecoveryCodeService,
    WebAuthnService,
    TwoFactorHelper
  ],
  exports: [
    AuthService,
    AuthGuard,
    TokenService,
    TotpService,
    RecoveryCodeService,
    WebAuthnService,
    TwoFactorHelper
  ]
})
export class AuthModule {}
