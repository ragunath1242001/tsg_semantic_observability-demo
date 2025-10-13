import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError, parseNetworkError } from "@tsg-dsp/common-api";
import {
  formatCredentials,
  toArray,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  PresentationDefinition,
  PresentationQueryMessage,
  PresentationResponseMessage,
  VerificationRequest
} from "@tsg-dsp/common-dtos";
import {
  resolveDid,
  validateDataIntegrityProof,
  validateField
} from "@tsg-dsp/common-signing-and-validation";
import axios from "axios";
import { instanceToPlain, plainToInstance } from "class-transformer";

import { SecureTokenService } from "../../keys/token.service.js";
import { PresentationService } from "../presentation.service.js";

@Injectable()
export class DCPVerifierService {
  constructor(
    private readonly siopService: SecureTokenService,
    private readonly presentationService: PresentationService
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async verify(
    verificationRequest: VerificationRequest
  ): Promise<VerifiablePresentation[]> {
    const verifiedHolderIdToken = await this.siopService.validateIDToken(
      verificationRequest.holderIdToken
    );
    this.logger.log(
      `Requesting and verifying presentation for holder ${verifiedHolderIdToken.iss}`
    );
    const presentationDefinitions: PresentationDefinition[] = [];
    if (verificationRequest.presentationDefinition) {
      this.logger.debug(
        `With presentation definition: ${JSON.stringify(verificationRequest.presentationDefinition)}`
      );
      presentationDefinitions.push(verificationRequest.presentationDefinition);
    } else if (verificationRequest.scope) {
      this.logger.debug(`With scope: ${verificationRequest.scope.join(", ")}`);
      presentationDefinitions.push(
        ...(await Promise.all(
          verificationRequest.scope.map((scope) =>
            this.presentationService.interpretScope(scope)
          )
        ))
      );
    } else {
      throw new AppError(
        `Either a presentationDefinition or scope needs to be provided`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (!verifiedHolderIdToken.token) {
      throw new AppError(
        `No access token in ID token`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "error");
    }

    const idToken = await this.siopService.createSelfIssuedIDToken({
      audience: verifiedHolderIdToken.iss!,
      createAccessToken: false,
      scope: undefined,
      existingAccessToken: verifiedHolderIdToken.token as string
    });

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
          presentationDefinition: verificationRequest.presentationDefinition,
          scope: verificationRequest.scope
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
      throw parseNetworkError(
        err,
        "presentation response from holder",
        HttpStatus.BAD_REQUEST,
        true
      );
    }
    return await this.evaluatePresentationResponseMessage(
      presentationDefinitions,
      presentationResponseMessage
    );
  }

  private async evaluatePresentationResponseMessage(
    presentationDefinitions: PresentationDefinition[],
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
            presentations.push(validatedVp.presentation);
          } else {
            this.logger.error(`Error validating presentation: ${validatedVp}`);
          }
        } else {
          const parsedVp = plainToInstance(VerifiablePresentation, vp);
          const { proof, ...plainVp } = parsedVp;
          if (proof) {
            await validateDataIntegrityProof(plainVp, toArray(proof)[0]);
          }
          presentations.push(parsedVp);
        }
      } catch (error) {
        this.logger.error(`Error validating presentation: ${error}`);
      }
    }
    const credentials = presentations.flatMap((vp) =>
      formatCredentials(toArray(vp.verifiableCredential))
    );
    const inputDescriptors = presentationDefinitions.flatMap(
      (presentationDefinition) => presentationDefinition.input_descriptors
    );
    for (const inputDescriptor of inputDescriptors) {
      for (const fieldDescriptor of inputDescriptor.constraints.fields ?? []) {
        const result = credentials.map((vc) =>
          validateField(fieldDescriptor, vc.credential, false)
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
