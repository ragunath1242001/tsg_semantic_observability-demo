import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DCPSiopService } from "./siop.service.js";
import { AppError, parseNetworkError } from "../../utils/error.js";
import { DidResolverService } from "../../did/did.resolver.service.js";
import axios from "axios";
import { PresentationService } from "../presentation.service.js";
import { decodeJwt } from "jose";
import { Ajv } from "ajv";
import jsonpath from "jsonpath";
import {
  PresentationDefinition,
  PresentationResponse,
  Field,
  PresentationQueryMessage,
  PresentationResponseMessage
} from "@tsg-dsp/common-dtos";
import { toArray, VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { SignatureService } from "../../keys/signature.service.js";

@Injectable()
export class DCPVerifierService {
  constructor(
    private readonly siopService: DCPSiopService,
    private readonly didResolver: DidResolverService,
    private readonly presentationService: PresentationService,
    private readonly signatureService: SignatureService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  //@ts-expect-error ajv error
  private readonly ajv = new Ajv.default();

  async verify(
    holderIdToken: string,
    presentationDefinition: PresentationDefinition
  ): Promise<VerifiablePresentation[]> {
    const verifiedHolderIdToken =
      await this.siopService.validateIDToken(holderIdToken);
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
      (s) => s.type === "CredentialService"
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
        `No CredentialService service endpoint present in holder DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    let presentationResponseMessage: PresentationResponseMessage;
    try {
      this.logger.log(
        `Requesting presentation at ${serviceEndpoint}/presentations/query`
      );
      const presentationQueryMessage: PresentationQueryMessage =
        plainToInstance(PresentationQueryMessage, {
          "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
          type: "PresentationQueryMessage",
          presentationDefinition: presentationDefinition
        });
      const response = await axios.post<PresentationResponseMessage>(
        `${serviceEndpoint}/presentations/query`,
        instanceToPlain(presentationQueryMessage),
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      );
      presentationResponseMessage = response.data;
    } catch (err) {
      throw parseNetworkError(err, "presentation response from holder");
    }
    return await this.evaluatePresentationResponseMessage(
      presentationDefinition,
      presentationResponseMessage
    );
  }

  private async evaluatePresentationResponseMessage(
    definition: PresentationDefinition,
    response: PresentationResponseMessage
  ): Promise<VerifiablePresentation[]> {
    const presentations: VerifiablePresentation[] = [];
    for (const vp of response.presentation) {
      try {
        if (typeof vp === "string") {
          const validatedVp =
            await this.presentationService.validatePresentation({
              vp: vp
            });
          if (validatedVp.valid) {
            const vpJwtPayload = decodeJwt(vp);
            const parsedVp = plainToInstance(
              VerifiablePresentation,
              vpJwtPayload.vp
            );
            presentations.push(parsedVp);
          } else {
            this.logger.error(`Error validating presentation: ${validatedVp}`);
          }
        } else {
          const parsedVp = plainToInstance(VerifiablePresentation, vp);
          const { proof, ...plainVp } = parsedVp;
          if (proof)
            await this.signatureService.validateProof(
              plainVp,
              toArray(proof)[0]
            );
          presentations.push(parsedVp);
        }
      } catch (error) {
        this.logger.error(`Error validating presentation: ${error}`);
      }
    }
    const credentials = presentations.flatMap((vp) =>
      toArray(vp.verifiableCredential)
    );
    for (const inputDescriptor of definition.input_descriptors) {
      for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
        const result = credentials.map((vc) =>
          this.validateField(fieldDescriptor, vc, false)
        );
        if (result.every((r) => r.error)) {
          this.logger.debug(
            `No field matching ${fieldDescriptor.path} found in any of the VCs: ${result.map((r) => r.message).join(", ")}`
          );
          throw new AppError(
            `No field matching ${fieldDescriptor.path} found in any of the VCs`,
            HttpStatus.FORBIDDEN
          ).andLog(this.logger, "error");
        }
      }
    }
    return presentations;
  }

  private async evaluatePresentationResponse(
    definition: PresentationDefinition,
    response: PresentationResponse
  ): Promise<VerifiablePresentation> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    const vpValidation = await this.presentationService.validatePresentation({
      vp: response.vp_token
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
    return plainToInstance(VerifiablePresentation, vpJson);
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  validateField(
    fieldDescriptor: Field,
    vpJson: any,
    throwOnError = true
  ): {
    error: boolean;
    found: boolean;
    validated?: boolean;
    message?: string;
  } {
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
        return {
          error: false,
          found: false,
          validated: false
        };
      } else {
        if (throwOnError) {
          throw new AppError(
            `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`,
            HttpStatus.FORBIDDEN
          ).andLog(this.logger, "error");
        } else {
          return {
            error: true,
            found: false,
            message: `Could not find field matching ${fieldDescriptor.path} (${fieldDescriptor.name})`
          };
        }
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
          if (throwOnError) {
            throw new AppError(
              `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
              HttpStatus.FORBIDDEN
            ).andLog(this.logger, "error");
          } else {
            return {
              error: true,
              found: true,
              validated: false,
              message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
            };
          }
        }
      } else {
        if (!validate(field)) {
          if (throwOnError) {
            throw new AppError(
              `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`,
              HttpStatus.FORBIDDEN
            ).andLog(this.logger, "error");
          } else {
            return {
              error: true,
              found: true,
              validated: false,
              message: `Error in json schema validation for ${fieldDescriptor.path} (${fieldDescriptor.name})`
            };
          }
        }
      }
    }
    return {
      error: false,
      found: true,
      validated: true
    };
  }
}
