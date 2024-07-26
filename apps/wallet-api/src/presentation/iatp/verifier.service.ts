import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { IatpSiopService } from "./siop.service.js";
import { AppError, parseNetworkError } from "../../utils/error.js";
import { DidResolverService } from "../../did/did.resolver.service.js";
import axios from "axios";
import { toArray } from "../../utils/unions.js";
import { PresentationService } from "../presentation.service.js";
import { decodeJwt } from "jose";
import { Ajv } from "ajv";
import jsonpath from "jsonpath";
import {
  PresentationDefinition,
  PresentationResponse,
  Field,
} from "@tsg-dsp/wallet-dtos";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";

@Injectable()
export class IatpVerifierService {
  constructor(
    private readonly siopService: IatpSiopService,
    private readonly didResolver: DidResolverService,
    private readonly presentationService: PresentationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  //@ts-expect-error ajv error
  private readonly ajv = new Ajv.default();

  async verify(
    holderIdToken: string,
    presentationDefinition: PresentationDefinition
  ): Promise<VerifiablePresentation<VerifiableCredential<CredentialSubject>>> {
    const verifiedHolderIdToken = await this.siopService.validateIDToken(
      holderIdToken
    );
    this.logger.log(
      `Requesting and verifying presentation for holder ${verifiedHolderIdToken.iss}`
    );
    this.logger.debug(
      `With presentation definition: ${JSON.stringify(presentationDefinition)}`
    );

    if (!verifiedHolderIdToken.token) {
      throw new AppError(
        `No access token in ID token`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    const idToken = await this.siopService.createSelfIssuedIDToken(
      verifiedHolderIdToken.iss!,
      false,
      undefined,
      verifiedHolderIdToken.token as string
    );

    const didDocument = await this.didResolver.resolve(
      verifiedHolderIdToken.iss!
    );
    const presentationService = didDocument.service?.find(
      (s) => s.type === "PresentationService"
    );

    if (!presentationService) {
      throw new AppError(
        `No presentation service present in holder DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    const serviceEndpoint = toArray(presentationService.serviceEndpoint)[0];

    if (!serviceEndpoint || typeof serviceEndpoint !== "string") {
      throw new AppError(
        `No presentation service endpoint present in holder DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    let presentationResponse: PresentationResponse;
    try {
      this.logger.log(`Requesting presentation at ${serviceEndpoint}`);
      const response = await axios.get<PresentationResponse>(serviceEndpoint, {
        params: {
          presentation_definition: JSON.stringify(presentationDefinition),
        },
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      presentationResponse = response.data;
    } catch (err) {
      throw parseNetworkError(err, "presentation response from holder");
    }
    return await this.evaluatePresentationResponse(
      presentationDefinition,
      presentationResponse
    );
  }

  private async evaluatePresentationResponse(
    definition: PresentationDefinition,
    response: PresentationResponse
  ): Promise<VerifiablePresentation<VerifiableCredential<CredentialSubject>>> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    const vpValidation = await this.presentationService.validatePresentation({
      vp: response.vp_token,
    });
    this.logger.debug(`Definition: ${JSON.stringify(definition)}`);
    this.logger.debug(`Response: ${JSON.stringify(response)}`);
    if (!vpValidation.valid) {
      throw new AppError(
        `Invalid verifiable presentation ${JSON.stringify(vpValidation)}`,
        HttpStatus.FORBIDDEN
      ).andLog(this.logger, "error");
    }
    const vpJwt = decodeJwt(response.vp_token);
    const vpJson = vpJwt.vp;

    for (const inputDescriptor of definition.input_descriptors) {
      const descriptor = response.presentation_submission.descriptor_map.find(
        (d) => d.id === inputDescriptor.id
      );
      if (!descriptor) {
        throw new AppError(
          `No descriptor map found for input descriptor ${inputDescriptor.id} (${inputDescriptor.name})`,
          HttpStatus.FORBIDDEN
        ).andLog(this.logger, "error");
      }
      const queryResult = jsonpath.query(vpJson, descriptor.path, 1);
      if (!queryResult[0]) {
        throw new AppError(
          `Descriptor path ${descriptor.path} not found in VP (${inputDescriptor.name})`,
          HttpStatus.FORBIDDEN
        ).andLog(this.logger, "error");
      }
      for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
        this.validateField(fieldDescriptor, queryResult[0]);
      }
    }
    return plainToInstance(
      VerifiablePresentation<VerifiableCredential<CredentialSubject>>,
      vpJson
    );
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  validateField(fieldDescriptor: Field, vpJson: any) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let field: any | undefined = undefined;
    for (const path of fieldDescriptor.path) {
      const queryResult = jsonpath.query(vpJson, path, 1);
      if (queryResult[0]) {
        field = queryResult[0];
        break;
      }
    }
    if (field === undefined) {
      if (fieldDescriptor.optional === true) {
        return;
      } else {
        throw new AppError(
          `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`,
          HttpStatus.FORBIDDEN
        ).andLog(this.logger, "error");
      }
    }
    if (fieldDescriptor.filter) {
      const validate = this.ajv.compile(fieldDescriptor.filter);
      if (Array.isArray(field) && fieldDescriptor.filter.type !== "array") {
        let validated = false;
        for (const item of field) {
          if (validate(item)) {
            validated = true;
            break;
          }
        }
        if (!validated) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          ).andLog(this.logger, "error");
        }
      } else {
        if (!validate(field)) {
          throw new AppError(
            `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          ).andLog(this.logger, "error");
        }
      }
    }
  }
}
