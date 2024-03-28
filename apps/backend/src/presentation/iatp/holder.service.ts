import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PresentationService } from "../presentation.service.js";
import { IatpSiopService } from "./siop.service.js";
import {
  Field,
  PresentationDefinition,
  PresentationResponse,
} from "@libs/dtos";
import { CredentialsService } from "../../credentials/credentials.service.js";
import Ajv from "ajv";
import jsonpath from "jsonpath";
import { Credentials } from "../../model/credentials.dao.js";
import { AppError } from "../../utils/error.js";

@Injectable()
export class IatpHolderService {
  constructor(
    private readonly credentialService: CredentialsService,
    private readonly presentationService: PresentationService,
    private readonly siopService: IatpSiopService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  private readonly ajv = new Ajv.default();

  async presentationRequest(
    presentationDefinition: PresentationDefinition,
    verifierIdTokenHeader: string
  ): Promise<PresentationResponse> {
    const verifierIdToken = verifierIdTokenHeader.substring(7);
    const validatedIdToken =
      await this.siopService.validateIDTokenWithAccessToken(verifierIdToken);
    this.logger.log(
      `Received presentation request from ${validatedIdToken.tokenPayload.iss}`
    );
    const credentials = await this.credentialService.getCredentials();

    const matchedCredentials: Credentials[] = [];

    for (const inputDescriptor of presentationDefinition.input_descriptors) {
      this.logger.debug(
        `Finding credential matching input descriptor ${inputDescriptor.id} ${
          inputDescriptor.name ?? ""
        }`
      );
      let matchedInputDescriptorCredentials: [number, Credentials][] =
        credentials.map((c) => [0, c]);
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
                this.matchCredential(fieldDescriptor, c[1], validateFunction)
              ) {
                return [c[0] + 1, c[1]];
              } else {
                return [c[0], c[1]];
              }
            });
        } else {
          matchedInputDescriptorCredentials =
            matchedInputDescriptorCredentials.filter((c) =>
              this.matchCredential(fieldDescriptor, c[1], validateFunction)
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
        matchedCredentials.push(matchedInputDescriptorCredentials[0][1]);
      } else {
        const sortedCredentials = matchedInputDescriptorCredentials.sort(
          (a, b) =>
            b[0] - a[0] || b[1].created.getTime() - a[1].created.getTime()
        );
        matchedCredentials.push(sortedCredentials[0][1]);
      }
    }
    this.logger.log(
      `Presenting credentials ${matchedCredentials.map((c) => c.credential.id)}`
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
              path: `$.verifiableCredential[${index}]`,
            };
          }
        ),
      },
    };
  }

  matchCredential(
    fieldDescriptor: Field,
    credential: Credentials,
    validateFunction?: Ajv.ValidateFunction
  ): Credentials | undefined {
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
