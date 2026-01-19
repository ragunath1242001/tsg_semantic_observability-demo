import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { nonEmptyStringPipe } from "@tsg-dsp/common-api";
import { Request } from "express";

import { TotpService } from "./totp.service.js";

@ApiTags("TOTP")
@Controller("auth/totp")
export class TotpController {
  constructor(private readonly totpService: TotpService) {}

  @Get("qr")
  @ApiOperation({
    summary: "Get TOTP Setup QR Code",
    description: "Get QR code for setting up TOTP two-factor authentication"
  })
  @HttpCode(HttpStatus.OK)
  async get2FAQRCode(@Req() request: Request) {
    const qrCode = await this.totpService.get2FASetupQRCode(request);
    return { qrCode };
  }

  @Get("secret")
  @ApiOperation({
    summary: "Get TOTP Setup Secret",
    description: "Get the raw secret for manual entry into authenticator apps"
  })
  @HttpCode(HttpStatus.OK)
  async get2FASecret(@Req() request: Request) {
    const secret = await this.totpService.get2FASetupSecret(request);
    return { secret };
  }

  @Post("setup")
  @ApiOperation({
    summary: "Verify TOTP Setup",
    description: "Verify and complete TOTP two-factor authentication setup"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: {
          example: "123456",
          type: "string"
        }
      },
      required: ["token"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async verify2FASetup(
    @Body("token", nonEmptyStringPipe) token: string,
    @Req() request: Request
  ) {
    return await this.totpService.verify2FASetup(request, token);
  }

  @Post("register/initiate")
  @ApiOperation({
    summary: "Initiate TOTP Registration",
    description: "Start the process of registering a new TOTP credential"
  })
  @HttpCode(HttpStatus.OK)
  async initiateTotpRegistration(@Req() request: Request) {
    return await this.totpService.initiateTotpRegistration(request);
  }

  @Post("register/complete")
  @ApiOperation({
    summary: "Complete TOTP Registration",
    description: "Complete the registration of a new TOTP credential"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: {
          example: "123456",
          type: "string"
        },
        deviceName: {
          example: "My Phone",
          type: "string"
        }
      },
      required: ["token"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async completeTotpRegistration(
    @Body("token", nonEmptyStringPipe) token: string,
    @Body("deviceName") deviceName: string | undefined,
    @Req() request: Request
  ) {
    return await this.totpService.completeTotpRegistration(
      request,
      token,
      deviceName
    );
  }

  @Get("credentials")
  @ApiOperation({
    summary: "List TOTP Credentials",
    description: "Get all registered TOTP credentials for the current user"
  })
  @HttpCode(HttpStatus.OK)
  async listTotpCredentials(@Req() request: Request) {
    return await this.totpService.listTotpCredentials(request);
  }

  @Post("credentials/:id/delete")
  @ApiOperation({
    summary: "Delete TOTP Credential",
    description: "Remove a registered TOTP credential"
  })
  @HttpCode(HttpStatus.OK)
  async deleteTotpCredential(
    @Body("id") credentialId: number,
    @Req() request: Request
  ) {
    return await this.totpService.deleteTotpCredential(request, credentialId);
  }

  @Post("enable")
  @ApiOperation({
    summary: "Enable 2FA for current user",
    description: "Enable two-factor authentication for the current user profile"
  })
  @HttpCode(HttpStatus.OK)
  async enable2FA(@Req() request: Request) {
    return await this.totpService.enable2FA(request);
  }

  @Delete("disable")
  @ApiOperation({
    summary: "Disable 2FA for current user",
    description:
      "Disable two-factor authentication (requires password confirmation)"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        password: {
          type: "string",
          description: "User password for confirmation"
        }
      },
      required: ["password"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async disable2FA(
    @Body("password", nonEmptyStringPipe) password: string,
    @Req() request: Request
  ) {
    return await this.totpService.disable2FA(request, password);
  }

  @Post("reset")
  @ApiOperation({
    summary: "Reset 2FA for current user",
    description:
      "Reset two-factor authentication (requires password confirmation)"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        password: {
          type: "string",
          description: "User password for confirmation"
        }
      },
      required: ["password"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async reset2FA(
    @Body("password", nonEmptyStringPipe) password: string,
    @Req() request: Request
  ) {
    return await this.totpService.reset2FA(request, password);
  }

  @Get("profile/qr")
  @ApiOperation({
    summary: "Get 2FA QR Code for Profile",
    description:
      "Get QR code for the current user's TOTP setup in profile settings"
  })
  @HttpCode(HttpStatus.OK)
  async get2FAQRCodeForProfile(@Req() request: Request) {
    return await this.totpService.get2FAQRCodeForProfile(request);
  }

  @Get("profile/secret")
  @ApiOperation({
    summary: "Get 2FA Secret for Profile",
    description:
      "Get the raw secret for the current user's TOTP setup in profile settings"
  })
  @HttpCode(HttpStatus.OK)
  async get2FASecretForProfile(@Req() request: Request) {
    return await this.totpService.get2FASecretForProfile(request);
  }

  @Post("profile/verify")
  @ApiOperation({
    summary: "Verify 2FA Setup for Profile",
    description: "Verify and complete TOTP setup in profile settings"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: {
          example: "123456",
          type: "string"
        }
      },
      required: ["token"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async verify2FASetupForProfile(
    @Body("token", nonEmptyStringPipe) token: string,
    @Req() request: Request
  ) {
    return await this.totpService.verify2FASetupForProfile(request, token);
  }
}
