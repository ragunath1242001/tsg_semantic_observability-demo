import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { validateOrRejectSync } from "@tsg-dsp/common-api";
import { AgreementDto, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { plainToInstance, Type } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { EvaluationTrigger } from "./constraint.dto.js";

export class PolicyContext {
  @IsObject()
  @IsDefined()
  @ApiProperty({
    example: {
      "@type": "Agreement",
      assigner: "did:example:assigner",
      assignee: "did:example:assignee",
      timestamp: "2021-06-01T00:00:00Z",
      target: "did:example:target"
    }
  })
  agreement!: AgreementDto;
  @IsOptional()
  @ApiPropertyOptional({
    example: { algorithm: "SHA-256", digest: "..." }
  })
  localSignature?: {
    algorithm: string;
    digest: string;
  };
  @IsOptional()
  @ApiPropertyOptional({
    example: { algorithm: "SHA-256", digest: "..." }
  })
  remoteSignature?: {
    algorithm: string;
    digest: string;
  };
  @IsOptional()
  @ApiPropertyOptional({ example: "VALID" })
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
  @ApiPropertyOptional({ example: "b86483f3-3792-4a54-b11e-f1c6face9935" })
  transferId?: string;
  @IsString()
  @ApiProperty({ example: "did:example:localParticipant" })
  localParticipant!: string;
  @IsString()
  @ApiProperty({ example: "did:example:remoteParticipant" })
  remoteParticipant!: string;
  @IsString()
  @ApiProperty({ example: "randomDataSetID" })
  target!: string;
  @IsString()
  @ApiProperty({ example: "USE" })
  action!: string;
  @Type(() => VerifiableCredential)
  @ValidateNested()
  @ApiProperty({ type: () => VerifiableCredential })
  verifiableCredentials!: VerifiableCredential[];
  @IsDate()
  @ApiProperty({ example: "2025-02-21T10:26:42.206Z" })
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
    plain: Pick<EvaluationContext, keyof EvaluationContext>
  ): EvaluationContext {
    return validateOrRejectSync(plainToInstance(EvaluationContext, plain, {}));
  }
}

export enum EvaluationResult {
  VALID = "VALID",
  INVALID = "INVALID",
  INDECISIVE = "INDECISIVE",
  NOT_APPLICABLE = "NOT_APPLICABLE"
}

export class EvaluationDecision {
  @IsIn(["ALLOW", "DENY"])
  @IsString()
  @ApiProperty({ example: "DENY" })
  decision!: "ALLOW" | "DENY";
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: "Invalid signature" })
  reason?: string;
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: ["VALID"] })
  permissions?: EvaluationResult[];
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: ["INVALID"] })
  prohibitions?: EvaluationResult[];
  @IsEnum(EvaluationResult, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: ["INDECISIVE"] })
  obligations?: EvaluationResult[];
  @ValidateNested()
  @Type(() => EvaluationContext)
  @IsOptional()
  @ApiPropertyOptional({ type: () => EvaluationContext })
  context?: EvaluationContext;
  static parse(plain: unknown): EvaluationDecision {
    return validateOrRejectSync(plainToInstance(EvaluationDecision, plain, {}));
  }
}
