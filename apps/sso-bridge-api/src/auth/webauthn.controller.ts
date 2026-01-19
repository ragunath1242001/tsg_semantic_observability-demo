import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/types";
import { Request } from "express";

import { WebAuthnService } from "./webauthn.service.js";

@ApiTags("WebAuthn")
@Controller("auth/webauthn")
export class WebAuthnController {
  constructor(private readonly webAuthnService: WebAuthnService) {}

  @Post("register/initiate")
  @ApiOperation({
    summary: "Initiate WebAuthn Registration",
    description:
      "Start the process of registering a new WebAuthn credential (passkey)"
  })
  @HttpCode(HttpStatus.OK)
  async initiateWebAuthnRegistration(@Req() request: Request) {
    return await this.webAuthnService.initiateWebAuthnRegistration(request);
  }

  @Post("register/complete")
  @ApiOperation({
    summary: "Complete WebAuthn Registration",
    description: "Complete the registration of a new WebAuthn credential"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        response: {
          type: "object",
          description:
            "WebAuthn registration response from navigator.credentials.create()"
        },
        deviceName: {
          example: "My Phone",
          type: "string"
        }
      },
      required: ["response"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async completeWebAuthnRegistration(
    @Body("response") response: RegistrationResponseJSON,
    @Body("deviceName") deviceName: string | undefined,
    @Req() request: Request
  ) {
    return await this.webAuthnService.completeWebAuthnRegistration(
      request,
      response,
      deviceName
    );
  }

  @Post("authenticate/initiate")
  @ApiOperation({
    summary: "Initiate WebAuthn Authentication",
    description: "Start WebAuthn authentication as a second factor"
  })
  @HttpCode(HttpStatus.OK)
  async initiateWebAuthnAuthentication(@Req() request: Request) {
    return await this.webAuthnService.initiateWebAuthnAuthentication(request);
  }

  @Post("authenticate/complete")
  @ApiOperation({
    summary: "Complete WebAuthn Authentication",
    description: "Complete WebAuthn authentication for 2FA"
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        response: {
          type: "object",
          description:
            "WebAuthn authentication response from navigator.credentials.get()"
        }
      },
      required: ["response"]
    }
  })
  @HttpCode(HttpStatus.OK)
  async completeWebAuthnAuthentication(
    @Body("response") response: AuthenticationResponseJSON,
    @Req() request: Request
  ) {
    return await this.webAuthnService.completeWebAuthnAuthentication(
      request,
      response
    );
  }

  @Get("credentials")
  @ApiOperation({
    summary: "List WebAuthn Credentials",
    description: "Get all registered WebAuthn credentials for the current user"
  })
  @HttpCode(HttpStatus.OK)
  async listWebAuthnCredentials(@Req() request: Request) {
    return await this.webAuthnService.listWebAuthnCredentials(request);
  }

  @Post("credentials/:id/delete")
  @ApiOperation({
    summary: "Delete WebAuthn Credential",
    description: "Remove a registered WebAuthn credential"
  })
  @HttpCode(HttpStatus.OK)
  async deleteWebAuthnCredential(
    @Body("id") credentialId: number,
    @Req() request: Request
  ) {
    return await this.webAuthnService.deleteWebAuthnCredential(
      request,
      credentialId
    );
  }
}
