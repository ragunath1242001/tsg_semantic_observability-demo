import {
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  createParamDecorator
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
  toArray
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { JwtPayload, decode } from "jsonwebtoken";
import { Strategy } from "passport-http-bearer";
import { DSPError } from "../utils/errors/error";
import { AuthService } from "./auth.service";
import { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AgreementDao, TransferMonitorDao } from "../model/agreement.dao";
import { RootConfig } from "../config";
import { RuleRepositoryService } from "../policy/rule.repository.service";
import { InputDescriptor } from "@tsg-dsp/common-dtos";

export const VP = createParamDecorator(
  (_, context: ExecutionContext): VerifiablePresentation | undefined => {
    try {
      const request = context.switchToHttp().getRequest();
      if (!request.user) return undefined;
      const vp = plainToInstance(VerifiablePresentation, request.user);
      return vp;
    } catch (err) {
      throw new DSPError(
        `Error in retrieving VP`,
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(new Logger("VP Decorator"));
    }
  }
);

export const VPId = createParamDecorator(
  (_, context: ExecutionContext): string | undefined => {
    try {
      const request = context.switchToHttp().getRequest();
      if (!request.user) return undefined;
      const vp = plainToInstance(VerifiablePresentation, request.user);
      return toArray(toArray(vp.verifiableCredential)[0].credentialSubject)[0]
        .id;
    } catch (err) {
      throw new DSPError(
        `Error in retrieving VP ID`,
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(new Logger("VP ID Decorator"));
    }
  }
);

@Injectable()
export class VerifiablePresentationStrategy extends PassportStrategy(
  Strategy,
  "vp"
) {
  constructor(private readonly authService: AuthService) {
    super({
      passReqToCallback: true
    });
  }
  private readonly logger = new Logger(this.constructor.name);

  async validate(req: Request, token: string) {
    let tokenPayload: JwtPayload | null = null;
    try {
      tokenPayload = decode(token, { json: true });
    } catch (err) {
      throw new DSPError(
        "Malformed token",
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(this.logger, "warn");
    }
    if (!tokenPayload) {
      this.logger.warn(`Token could not be decoded: ${tokenPayload}`);
      throw new DSPError(
        "Token could not be decoded",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    const valid = await this.authService.validateToken(token);
    if (!valid) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    return valid;
  }
}

@Injectable()
export class TransferVerifiablePresentationStrategy extends PassportStrategy(
  Strategy,
  "transfervp"
) {
  constructor(
    private readonly config: RootConfig,
    private readonly authService: AuthService,
    @InjectRepository(AgreementDao)
    private readonly agreementRepository: Repository<AgreementDao>,
    @InjectRepository(TransferMonitorDao)
    private readonly transferMonitorRepository: Repository<TransferMonitorDao>
  ) {
    super({
      passReqToCallback: true
    });
  }
  private readonly logger = new Logger(this.constructor.name);

  async validate(req: Request, token: string) {
    let tokenPayload: JwtPayload | null = null;
    try {
      tokenPayload = decode(token, { json: true });
    } catch (err) {
      throw new DSPError(
        "Malformed token",
        HttpStatus.UNAUTHORIZED,
        err
      ).andLog(this.logger, "warn");
    }
    if (!tokenPayload) {
      this.logger.warn(`Token could not be decoded: ${tokenPayload}`);
      throw new DSPError(
        "Token could not be decoded",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }

    this.logger.debug(`Find agreement for url ${req.url}`);
    let agreementDao: AgreementDao | null | undefined;
    if (req.params.id) {
      this.logger.debug(`Find agreement by param ${req.params.id}`);
      const transfer = await this.transferMonitorRepository.findOneBy({
        id: req.params.id
      });
      agreementDao = transfer?.agreement;
    } else if (req.body["dspace:agreementId"]) {
      this.logger.debug(
        `Find agreement by body ${req.body["dspace:agreementId"]}`
      );
      agreementDao = await this.agreementRepository.findOneBy({
        id: req.body["dspace:agreementId"]
      });
    }

    if (agreementDao) {
      this.logger.debug(`Found agreement ${agreementDao.id}`);
      const vpConstraints =
        agreementDao.agreement["odrl:permission"]?.flatMap(
          (p) =>
            p["odrl:constraint"]?.filter(
              (c) => c["odrl:leftOperand"] === "tsg:vpInputDescriptor"
            ) ?? []
        ) ?? [];
      if (vpConstraints.length > 0) {
        this.logger.debug(`Found VP constraint(s)`);
        for (const vpConstraint of vpConstraints) {
          const rightOperand = RuleRepositoryService.parseRightOperand(
            vpConstraint["odrl:rightOperand"]
          );
          let inputDescriptor: InputDescriptor[] | undefined = undefined;
          if (rightOperand) {
            try {
              const parsedOperand = JSON.parse(rightOperand);
              if (Array.isArray(parsedOperand)) {
                inputDescriptor = parsedOperand;
              } else {
                inputDescriptor = [parsedOperand];
              }
            } catch (e) {}
          }
          this.logger.debug(
            `Validating token with inputdescriptor: ${JSON.stringify(
              inputDescriptor
            )}`
          );
          const valid = await this.authService.validateToken(
            token,
            this.config.iam.didId,
            inputDescriptor
          );
          if (valid) {
            return valid;
          }
        }

        throw new DSPError(
          "Verifiable Presentation token not valid",
          HttpStatus.UNAUTHORIZED
        ).andLog(this.logger, "warn");
      }
    }
    const valid = await this.authService.validateToken(token);
    if (!valid) {
      throw new DSPError(
        "Verifiable Presentation token not valid",
        HttpStatus.UNAUTHORIZED
      ).andLog(this.logger, "warn");
    }
    return valid;
  }
}
