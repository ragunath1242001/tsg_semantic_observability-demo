import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DCPSiopService } from "./siop.service.js";
import { AppError, parseNetworkError } from "@tsg-dsp/common-api";

import axios from "axios";
import { PresentationService } from "../presentation.service.js";
import { decodeJwt } from "jose";
import {
  PresentationDefinition,
  PresentationQueryMessage,
  PresentationResponseMessage
} from "@tsg-dsp/common-dtos";
import { toArray, VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { instanceToPlain, plainToInstance } from "class-transformer";
import {
  resolveDid,
  validateField,
  validateProof
} from "@tsg-dsp/common-signing-and-validation";

@Injectable()
export class DCPVerifierService {
  constructor(
    private readonly siopService: DCPSiopService,
    private readonly presentationService: PresentationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

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

    const didDocument = await resolveDid(verifiedHolderIdToken.iss!);
    const credentialService = didDocument.service?.find(
      (s) => s.type === "CredentialService"
    );

    if (!credentialService) {
      throw new AppError(
        `No credential service present in holder DID document`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }
    const serviceEndpoint = toArray(credentialService.serviceEndpoint)[0];

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
          if (proof) await validateProof(plainVp, toArray(proof)[0]);
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
          validateField(fieldDescriptor, vc, false)
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
}
