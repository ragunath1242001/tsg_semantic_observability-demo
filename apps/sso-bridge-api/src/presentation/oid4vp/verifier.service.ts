import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, AuthorizationRequest, toArray } from "@tsg-dsp/common-api";
import {
  CredentialContainer,
  formatCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  DcqlQuery,
  OID4VPAuthorizationRequest,
  OID4VPAuthorizationResponse
} from "@tsg-dsp/common-dtos";
import {
  evaluatePresentationResponseValidity,
  getValueByPath
} from "@tsg-dsp/common-signing-and-validation";
import crypto from "crypto";
import { Request, Response } from "express";
import { Repository } from "typeorm";

import { RootConfig } from "../../config.js";
import { AuthorizationRequestDao } from "../../model/oid4vp.dao.js";
import { OauthUser } from "../../model/user.dao.js";
import { OauthService } from "../../oauth/oauth.service.js";
import { PermissionsService } from "../../permissions/permissions.service.js";
import { UsersService } from "../../users/users.service.js";
import { getSession } from "../../utils/session.js";

@Injectable()
export class OID4VPVerifierService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(AuthorizationRequestDao)
    public authorizationRequestRepository: Repository<AuthorizationRequestDao>,
    private readonly oauthService: OauthService,
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async getAuthorizationRequestFromDB(
    id: string
  ): Promise<AuthorizationRequestDao> {
    const authorizationRequest =
      await this.authorizationRequestRepository.findOne({
        where: {
          id: id
        },
        relations: ["user"]
      });
    if (!authorizationRequest) {
      throw new AppError(
        `Could not find the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    return authorizationRequest;
  }

  private getOid4vpUri(id: string): string {
    return `oid4vp://?client_id=${this.config.server.publicAddress}&request_uri=${this.config.server.publicAddress}/api/oid4vp/ar/${id}`;
  }

  async getOrCreateAuthorizationRequestUrl(
    id: string,
    authorizationRequest: AuthorizationRequest,
    dcqlQueryId?: string
  ): Promise<string> {
    try {
      await this.getAuthorizationRequestFromDB(id);
      return this.getOid4vpUri(id);
    } catch (err: unknown) {
      if (err instanceof AppError && err.getStatus() === HttpStatus.NOT_FOUND) {
        return await this.createAuthorizationRequest(
          id,
          authorizationRequest,
          dcqlQueryId || "User"
        );
      } else {
        throw err;
      }
    }
  }

  async createAuthorizationRequest(
    id: string,
    authorizationRequest: AuthorizationRequest,
    dcqlQueryId: string
  ): Promise<string> {
    const dcqlQuery = this.getDcqlQuery(dcqlQueryId);

    await this.authorizationRequestRepository.save(
      this.authorizationRequestRepository.create({
        id: id,
        nonce: crypto.randomBytes(48).toString("hex"),
        dcqlQuery: dcqlQuery,
        authorizationRequest: authorizationRequest,
        response_mode: "direct_post",
        response_type: "vp_token",
        response_uri: `${this.config.server.publicAddress}/api/oid4vp/authorize`
      })
    );
    return this.getOid4vpUri(id);
  }

  async getAuthorizationRequest(
    id: string
  ): Promise<OID4VPAuthorizationRequest> {
    const authorizationRequest = await this.getAuthorizationRequestFromDB(id);

    let dcqlQuery = authorizationRequest.dcqlQuery;
    if (!dcqlQuery) {
      dcqlQuery = this.getDefaultDcqlQuery();
      authorizationRequest.dcqlQuery = dcqlQuery;
      await this.authorizationRequestRepository.save(authorizationRequest);
    }

    return {
      client_id: `${this.config.server.publicAddress}`,
      redirect_uri:
        authorizationRequest.response_type ||
        `${this.config.server.publicAddress}/api/oid4vp/authorize`,
      response_type: authorizationRequest.response_type || "vp_token",
      response_mode: authorizationRequest.response_mode || "direct_post",
      state: authorizationRequest.id,
      nonce: authorizationRequest.nonce,
      response_uri:
        authorizationRequest.response_uri ||
        `${this.config.server.publicAddress}/api/oid4vp/authorize`,
      dcql_query: dcqlQuery
    };
  }

  async setSession(request: Request, response: Response, id: string) {
    const authorizationRequest = await this.getAuthorizationRequestFromDB(id);
    if (!authorizationRequest.authorizationRequest) {
      throw new AppError(
        `Could not find the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
    if (!authorizationRequest.user) {
      throw new AppError(
        `Could not find the user for the authorization request with id ${id}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }

    const loginResult = await this.oauthService.handleAuthorizationRequest(
      authorizationRequest.authorizationRequest,
      authorizationRequest.user
    );

    const session = getSession(request);
    if (session && !session.user) {
      session.user = authorizationRequest.user;
    }

    response.redirect(loginResult.url);
  }

  async verify(
    authorizationResponse: OID4VPAuthorizationResponse,
    requiredRole?: string
  ) {
    const obj = await this.getAuthorizationRequestFromDB(
      authorizationResponse.state
    );

    const dcqlQuery = obj.dcqlQuery;

    const verifiablePresentations = await evaluatePresentationResponseValidity(
      dcqlQuery,
      authorizationResponse,
      [],
      undefined,
      obj.nonce
    );

    const user = await this.handleVerifiablePresentations(
      verifiablePresentations,
      obj,
      requiredRole
    );

    return user;
  }

  private async handleVerifiablePresentations(
    verifiablePresentations: VerifiablePresentation[],
    authorizationRequest: AuthorizationRequestDao,
    requiredRole?: string
  ): Promise<OauthUser> {
    const { email, isAdmin, role } = this.extractCredentialData(
      verifiablePresentations
    );

    if (!email) {
      throw new AppError(
        "Could not find email in the verifiable presentation",
        HttpStatus.BAD_REQUEST
      );
    }

    if (requiredRole && role !== requiredRole) {
      throw new AppError(
        `Access denied: Required role '${requiredRole}' not found. User has role: '${role || "none"}'`,
        HttpStatus.FORBIDDEN
      );
    }

    const user = await this.getOrCreateUser(email, isAdmin);

    authorizationRequest.user = user;
    authorizationRequest.completed = true;
    await this.authorizationRequestRepository.save(authorizationRequest);
    return user;
  }

  private extractCredentialData(
    verifiablePresentations: VerifiablePresentation[]
  ): { email: string | undefined; isAdmin: boolean; role: string | undefined } {
    let email: string | undefined;
    let isAdmin = false;
    let role: string | undefined;

    const adminRoles = this.getAdminRolesFromConfig();

    for (const vp of verifiablePresentations) {
      const credentials = Array.isArray(vp.verifiableCredential)
        ? vp.verifiableCredential
        : [vp.verifiableCredential];

      for (const credential of credentials) {
        const credentialContainer = formatCredential(credential);
        const result = this.extractFromCredential(credentialContainer);
        if (result.email && !email) {
          email = result.email;
        }
        if (result.role) {
          if (!role) {
            role = result.role;
          }
          if (adminRoles.includes(result.role)) {
            isAdmin = true;
          }
        }
        if (email && role) {
          break;
        }
      }
      if (email && role) {
        break;
      }
    }

    return { email, isAdmin, role };
  }

  private extractFromCredential(credential: CredentialContainer): {
    email?: string;
    isAdmin: boolean;
    role?: string;
  } {
    const subjects = toArray(credential.credential.credentialSubject);

    let email: string | undefined;
    let role: string | undefined;

    const emailPaths = this.getClaimPathsFromConfig("email");
    const rolePaths = this.getClaimPathsFromConfig("role");

    for (const subject of subjects) {
      const subj = subject as Record<string, unknown>;

      if (!email) {
        email = this.extractClaimValue(subj, "email", emailPaths);
      }

      if (!role) {
        role = this.extractClaimValue(subj, "role", rolePaths);
      }

      if (email && role) {
        break;
      }
    }

    return { email, isAdmin: false, role };
  }

  private async getOrCreateUser(
    email: string,
    isAdmin: boolean
  ): Promise<OauthUser> {
    try {
      return await this.usersService.getUserByEmail(email);
    } catch (err) {
      if (
        !(err instanceof AppError && err.getStatus() === HttpStatus.NOT_FOUND)
      ) {
        throw err;
      }
      return this.createNewUser(email, isAdmin);
    }
  }

  private async createNewUser(
    email: string,
    isAdmin: boolean
  ): Promise<OauthUser> {
    // For users created via OID4VP, assign ssobridge_admin for admins, or no permissions for regular users
    const permissions = isAdmin ? ["manage:sso.*"] : ["read:*"];

    return this.usersService.createUser({
      username: email,
      email: email,
      password: "password",
      permissions,
      grants: ["authorization_code"]
    });
  }

  private getDcqlQuery(dcqlQueryId: string): DcqlQuery {
    if (!this.config?.dcqlQueryMap?.[dcqlQueryId]) {
      throw new Error(
        `DCQL query with ID "${dcqlQueryId}" not found in configuration`
      );
    }
    return this.config.dcqlQueryMap[dcqlQueryId];
  }

  private getDefaultDcqlQuery(): DcqlQuery {
    return this.getDcqlQuery("User");
  }

  private getAdminRolesFromConfig(): string[] {
    const adminRoles: string[] = [];

    try {
      if (this.config?.dcqlQueryMap) {
        if (this.config.dcqlQueryMap.Administrator) {
          const adminQuery = this.config.dcqlQueryMap.Administrator;
          adminQuery.credentials?.forEach((credential) => {
            credential.claims?.forEach((claim) => {
              if (claim.id === "role" && claim.values) {
                claim.values.forEach((value) => {
                  if (typeof value === "string") {
                    adminRoles.push(value);
                  }
                });
              }
            });
          });
        }
      }
    } catch (_error) {
      return ["Administrator"];
    }

    return adminRoles.length > 0 ? [...new Set(adminRoles)] : ["Administrator"];
  }

  private getClaimPathsFromConfig(claimId: string): string[][] {
    const paths: string[][] = [];

    try {
      if (this.config?.dcqlQueryMap) {
        Object.values(this.config.dcqlQueryMap).forEach((dcqlQuery) => {
          dcqlQuery.credentials?.forEach((credential) => {
            credential.claims?.forEach((claim) => {
              if (
                claim.id === claimId &&
                claim.path &&
                Array.isArray(claim.path)
              ) {
                const stringPath = claim.path
                  .filter(
                    (segment): segment is string | number => segment !== null
                  )
                  .map((segment) => String(segment));
                paths.push(stringPath);
              }
            });
          });
        });
      }
    } catch (_error) {
      return [];
    }

    return paths;
  }

  private extractClaimValue(
    subject: Record<string, unknown>,
    claimName: string,
    configPaths: string[][]
  ): string | undefined {
    if (configPaths.length > 0) {
      for (const path of configPaths) {
        const subjectPath =
          path[0] === "credentialSubject" ? path.slice(1) : path;
        try {
          const value = getValueByPath(subject, subjectPath);
          if (value && typeof value === "string") {
            return value;
          }
        } catch (error) {
          this.logger.verbose(
            `Error getting value by path ${JSON.stringify(path)}: ${error}`
          );
        }
      }
    } else if (subject[claimName] && typeof subject[claimName] === "string") {
      return subject[claimName] as string;
    }
    return undefined;
  }
}
