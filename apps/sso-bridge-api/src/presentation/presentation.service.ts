import { Injectable, Logger } from "@nestjs/common";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import {
  PresentationDefinition,
  PresentationResponse
} from "@tsg-dsp/common-dtos";
import { evaluatePresentationResponseValidity } from "@tsg-dsp/common-signing-and-validation";

@Injectable()
export class PresentationService {
  constructor() {}
  private readonly logger = new Logger(this.constructor.name);

  public async evaluatePresentationResponse(
    definition: PresentationDefinition,
    response: PresentationResponse
  ): Promise<VerifiablePresentation> {
    this.logger.log(`Evaluating presentation response`);
    this.logger.debug(`VP token: ${response.vp_token}`);
    this.logger.debug(`Definition: ${JSON.stringify(definition)}`);
    this.logger.debug(`Response: ${JSON.stringify(response)}`);
    return await evaluatePresentationResponseValidity(definition, response, []);
  }
}
