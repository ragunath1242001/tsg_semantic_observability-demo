import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import {
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt
} from "@tsg-dsp/common-dsp";
import {
  Field,
  PresentationDefinition,
  PresentationQueryMessage,
  PresentationResponseMessage,
  PresentationSubmission
} from "@tsg-dsp/common-dtos";
import { Ajv } from "ajv";
import jsonpath from "jsonpath";

import { CredentialsService } from "../../credentials/credentials.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import { CredentialDao } from "../../model/credentials.dao.js";
import { PresentationService } from "../presentation.service.js";

@Injectable()
export class DCPHolderService {
  constructor(
    private readonly credentialService: CredentialsService,
    private readonly presentationService: PresentationService,
    private readonly siopService: SecureTokenService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  // @ts-expect-error ajv error
  private readonly ajv = new Ajv.default();

  async presentationQuery(
    presentationQueryMessage: PresentationQueryMessage,
    verifierIdTokenHeader: string | undefined
  ): Promise<PresentationResponseMessage> {
    if (!verifierIdTokenHeader?.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization", HttpStatus.UNAUTHORIZED);
    }
    const verifierIdToken = verifierIdTokenHeader.split(" ")[1];
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
    let vpJwt: VerifiablePresentationJwt | undefined = undefined;
    let vpLdp: VerifiablePresentationJsonLd | undefined = undefined;
    const presentation_submission: PresentationSubmission = {
      id: crypto.randomUUID(),
      definition_id:
        presentationQueryMessage.presentationDefinition?.id ??
        crypto.randomUUID(),
      descriptor_map:
        presentationQueryMessage.presentationDefinition?.input_descriptors.map(
          (inputDescriptor) => ({
            id: inputDescriptor.id,
            format: "",
            path: ""
          })
        ) ?? []
    };
    const hasJwtCredentials = matchedCredentials.some((c) => c.jwt);
    const hasProofCredentials = matchedCredentials.some((c) => c.proof);
    if (hasJwtCredentials) {
      vpJwt = await this.presentationService.createVerifiablePresentationJwt(
        matchedCredentials.filter((c) => c.jwt),
        validatedIdToken.tokenPayload.iss!,
        false,
        "vp+jwt"
      );
      let vcIndex = 0;
      matchedCredentials.forEach((c, index) => {
        if (c.jwt) {
          presentation_submission.descriptor_map[index].format = "vp+jwt";
          presentation_submission.descriptor_map[index].path =
            `$.presentation[0]`;
          presentation_submission.descriptor_map[index].path_nested = {
            id: crypto.randomUUID(),
            format: "vc+jwt",
            path: `$.verifiableCredential[${vcIndex}]`
          };
          vcIndex++;
        }
      });
    }
    if (hasProofCredentials) {
      vpLdp = await this.presentationService.createVerifiablePresentationJsonLd(
        matchedCredentials.filter((c) => c.proof),
        false
      );
      let vcIndex = 0;
      matchedCredentials.forEach((c, index) => {
        if (c.proof) {
          presentation_submission.descriptor_map[index].format = "ldp_vp";
          presentation_submission.descriptor_map[index].path =
            `$.presentation[${hasJwtCredentials ? 1 : 0}].verifiableCredential[${vcIndex}]`;
          vcIndex++;
        }
      });
    }

    return {
      "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
      type: "PresentationResponseMessage",
      presentation: [vpJwt?.vp, vpLdp?.vp].filter((v) => v !== undefined),
      presentationSubmission: presentation_submission
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
