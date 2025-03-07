import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import {
  Field,
  PresentationDefinition,
  PresentationQueryMessage,
  PresentationResponse,
  PresentationResponseMessage
} from "@tsg-dsp/common-dtos";
import { Ajv } from "ajv";
import jsonpath from "jsonpath";

import { CredentialsService } from "../../credentials/credentials.service.js";
import { CredentialDao } from "../../model/credentials.dao.js";
import { PresentationService } from "../presentation.service.js";
import { DCPSiopService } from "./siop.service.js";

@Injectable()
export class DCPHolderService {
  constructor(
    private readonly credentialService: CredentialsService,
    private readonly presentationService: PresentationService,
    private readonly siopService: DCPSiopService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  // @ts-expect-error ajv error
  private readonly ajv = new Ajv.default();

  async presentationQuery(
    presentationQueryMessage: PresentationQueryMessage,
    verifierIdTokenHeader: string
  ): Promise<PresentationResponseMessage> {
    const verifierIdToken = verifierIdTokenHeader.substring(7);
    const validatedIdToken =
      await this.siopService.validateIDTokenWithAccessToken(verifierIdToken);
    this.logger.log(
      `Received presentation request from ${validatedIdToken.tokenPayload.iss}`
    );
    let matchedCredentials: CredentialDao[] = [];
    if (presentationQueryMessage.presentationDefinition) {
      matchedCredentials = await this.evaluatePresentationDefinition(
        presentationQueryMessage.presentationDefinition
      );
    } else if (
      presentationQueryMessage.scope &&
      presentationQueryMessage.scope.length > 0
    ) {
      matchedCredentials = await this.getCredentialsByScope(
        presentationQueryMessage.scope
      );
    }

    const vpJwt =
      await this.presentationService.createVerifiablePresentationJwt(
        matchedCredentials.map((c) => c.credential),
        validatedIdToken.tokenPayload.iss!,
        false
      );

    return {
      "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
      type: "PresentationResponseMessage",
      presentation: [vpJwt.vp]
    };
  }

  private async presentationRequest(
    presentationDefinition: PresentationDefinition,
    verifierIdTokenHeader: string
  ): Promise<PresentationResponse> {
    const verifierIdToken = verifierIdTokenHeader.substring(7);
    const validatedIdToken =
      await this.siopService.validateIDTokenWithAccessToken(verifierIdToken);
    this.logger.log(
      `Received presentation request from ${validatedIdToken.tokenPayload.iss}`
    );

    const matchedCredentials = await this.evaluatePresentationDefinition(
      presentationDefinition
    );

    const vpJwt =
      await this.presentationService.createVerifiablePresentationJwt(
        matchedCredentials.map((c) => c.credential),
        validatedIdToken.tokenPayload.iss!,
        false
      );

    return {
      vp_token: vpJwt.vp,
      presentation_submission: {
        id: crypto.randomUUID(),
        definition_id: presentationDefinition.id,
        descriptor_map: presentationDefinition.input_descriptors.map(
          (inputDescriptor, index) => {
            return {
              id: inputDescriptor.id,
              format: "jwt_vc",
              path: `$.verifiableCredential[${index}]`
            };
          }
        )
      }
    };
  }

  async getCredentialsByScope(scope: string[]): Promise<CredentialDao[]> {
    const desctructuredScopes = scope.map((scope) => {
      const [alias, ...discriminator] = scope.split(":");
      return {
        alias,
        discriminator: discriminator.join(":")
      };
    });
    const presentationDefinition: PresentationDefinition = {
      id: crypto.randomUUID(),
      name: "DCP Scoped Presentation definition",
      input_descriptors: []
    };
    for (const scope of desctructuredScopes) {
      if (scope.alias === "org.eclipse.dspace.dcp.vc.type") {
        presentationDefinition.input_descriptors.push({
          id: crypto.randomUUID(),
          name: "DCP VC Type Scope",
          constraints: {
            fields: [
              {
                path: ["$.type"],
                filter: {
                  type: "string",
                  pattern: scope.discriminator
                }
              }
            ]
          }
        });
      } else if (scope.alias === "org.eclipse.dspace.dcp.vc.id") {
        presentationDefinition.input_descriptors.push({
          id: crypto.randomUUID(),
          name: "DCP VC ID Scope",
          constraints: {
            fields: [
              {
                path: ["$.id"],
                filter: {
                  type: "string",
                  pattern: scope.discriminator
                }
              }
            ]
          }
        });
      } else {
        throw new AppError(
          `Scope alias ${scope.alias} not supported`,
          HttpStatus.NOT_IMPLEMENTED
        ).andLog(this.logger, "error");
      }
    }

    return this.evaluatePresentationDefinition(presentationDefinition);
  }

  async evaluatePresentationDefinition(
    presentationDefinition: PresentationDefinition
  ): Promise<CredentialDao[]> {
    const credentials = await this.credentialService.getCredentials();
    const matchedCredentials: CredentialDao[] = [];

    for (const inputDescriptor of presentationDefinition.input_descriptors) {
      this.logger.debug(
        `Finding credential matching input descriptor ${inputDescriptor.id} ${
          inputDescriptor.name ?? ""
        }`
      );
      let matchedInputDescriptorCredentials: {
        credential: CredentialDao;
        weight: number;
      }[] = credentials.map((c) => {
        return {
          credential: c,
          weight: 0
        };
      });
      for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
        this.logger.debug(
          `Finding credential with path ${
            fieldDescriptor.path
          } and filter ${JSON.stringify(fieldDescriptor.filter ?? "")}`
        );
        const validateFunction = fieldDescriptor.filter
          ? this.ajv.compile(fieldDescriptor.filter)
          : undefined;

        if (fieldDescriptor.optional === true) {
          matchedInputDescriptorCredentials =
            matchedInputDescriptorCredentials.map((c) => {
              if (
                this.matchCredential(
                  fieldDescriptor,
                  c.credential,
                  validateFunction
                )
              ) {
                return {
                  credential: c.credential,
                  weight: c.weight + 1
                };
              } else {
                return {
                  credential: c.credential,
                  weight: c.weight
                };
              }
            });
        } else {
          matchedInputDescriptorCredentials =
            matchedInputDescriptorCredentials.filter((c) =>
              this.matchCredential(
                fieldDescriptor,
                c.credential,
                validateFunction
              )
            );
        }
      }
      if (matchedInputDescriptorCredentials.length === 0) {
        throw new AppError(
          `No credential found for input descriptor ${inputDescriptor.id} (${
            inputDescriptor.name ?? ""
          })`,
          HttpStatus.NOT_FOUND
        ).andLog(this.logger, "error");
      } else if (matchedInputDescriptorCredentials.length === 1) {
        matchedCredentials.push(
          matchedInputDescriptorCredentials[0].credential
        );
      } else {
        const sortedCredentials = matchedInputDescriptorCredentials.sort(
          (a, b) =>
            b.weight - a.weight ||
            b.credential.createdDate.getTime() -
              a.credential.createdDate.getTime()
        );
        matchedCredentials.push(sortedCredentials[0].credential);
      }
    }
    this.logger.log(
      `Presenting credentials ${matchedCredentials.map((c) => c.credential.id)}`
    );
    return matchedCredentials;
  }

  matchCredential(
    fieldDescriptor: Field,
    credential: CredentialDao,
    // @ts-expect-error: ajv error
    validateFunction?: Ajv.ValidateFunction
  ): CredentialDao | undefined {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let field: any | undefined = undefined;
    for (const path of fieldDescriptor.path) {
      const queryResult = jsonpath.query(credential.credential, path, 1);
      if (queryResult[0]) {
        field = queryResult[0];
        break;
      }
    }
    if (field === undefined) {
      return undefined;
    }
    if (validateFunction) {
      if (Array.isArray(field) && fieldDescriptor.filter?.type !== "array") {
        for (const item of field) {
          if (validateFunction(item)) {
            return credential;
          }
        }
        return undefined;
      } else {
        if (validateFunction(field)) {
          return credential;
        } else {
          return undefined;
        }
      }
    }
    return credential;
  }
}
