import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AgreementDto,
  VerifiableCredential,
  CredentialSubject,
} from "@tsg-dsp/common-dsp";
import { Type, plainToInstance } from "class-transformer";
import {
  IsObject,
  IsDefined,
  IsOptional,
  IsIn,
  IsString,
  IsEnum,
  ValidateNested,
  IsDate,
} from "class-validator";
import { validateOrRejectSync } from "../utils/validation.pipe";
import { EvaluationTrigger } from "./constraint.dto";

export class PolicyContext {
  @IsObject()
  @IsDefined()
  @ApiProperty()
  agreement!: AgreementDto;
  @IsOptional()
  @ApiPropertyOptional()
  localSignature?: {
    "dspace:algorithm": string;
    "dspace:digest": string;
  };
  @IsOptional()
  @ApiPropertyOptional()
  remoteSignature?: {
    "dspace:algorithm": string;
    "dspace:digest": string;
  };
  @IsOptional()
  @ApiPropertyOptional()
  signatureStatus?: string;
}

export class EvaluationContext {
  @IsIn(["provider", "consumer"])
  @IsString()
  role!: "provider" | "consumer";
  @IsEnum(EvaluationTrigger)
  scope!: EvaluationTrigger;
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  transferId?: string;
  @IsString()
  @ApiProperty()
  localParticipant!: string;
  @IsString()
  @ApiProperty()
  remoteParticipant!: string;
  @IsString()
  @ApiProperty()
  target!: string;
  @IsString()
  @ApiProperty()
  action!: string;
  @Type(() => VerifiableCredential)
  @ValidateNested()
  @ApiProperty({ type: VerifiableCredential })
  verifiableCredentials!: VerifiableCredential[];
  @IsDate()
  @ApiProperty()
  evaluationTime!: Date;
  @ValidateNested()
  @Type(() => PolicyContext)
  policy!: PolicyContext;
  @IsOptional()
  @IsObject()
  dataPlane?: Record<string, any>;
  @IsOptional()
  @IsObject()
  transfer?: Record<string, any>;
  static parse(
    plain: Pick<EvaluationContext, keyof EvaluationContext>,
  ): EvaluationContext {
    return validateOrRejectSync(plainToInstance(EvaluationContext, plain, {}));
  }
}

export enum EvaluationResult {
  VALID = "VALID",
  INVALID = "INVALID",
  INDECISIVE = "INDECISIVE",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export class EvaluationDecision {
  @IsIn(["ALLOW", "DENY"])
  @IsString()
  @ApiProperty()
  decision!: "ALLOW" | "DENY";
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  reason?: string;
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional()
  permissions?: EvaluationResult[];
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional()
  prohibitions?: EvaluationResult[];
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional()
  obligations?: EvaluationResult[];
  @ValidateNested()
  @Type(() => EvaluationContext)
  @IsOptional()
  @ApiPropertyOptional()
  context?: EvaluationContext;
  static parse(plain: unknown): EvaluationDecision {
    return validateOrRejectSync(plainToInstance(EvaluationDecision, plain, {}));
  }
}
