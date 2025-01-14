import {
  AgreementDto,
  AgreementSchema,
  ContractAgreementVerificationMessageDto,
  ContractAgreementVerificationMessageSchema,
  ContractNegotiationState,
  HashedMessage,
  HashedMessageSchema,
  MultilanguageDto,
  MultilanguageSchema,
  OfferDto,
  OfferSchema
} from "@tsg-dsp/common-dsp";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export type NegotiationRole = "provider" | "consumer";

export class NegotiationProcessEventDto {
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  time!: Date;

  @ApiProperty({ enum: ContractNegotiationState })
  @IsEnum(ContractNegotiationState)
  state!: ContractNegotiationState;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ type: () => [MultilanguageSchema] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MultilanguageSchema)
  reason?: MultilanguageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementMessage?: string;

  @ApiPropertyOptional({
    type: () => ContractAgreementVerificationMessageSchema
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractAgreementVerificationMessageSchema)
  verification?: ContractAgreementVerificationMessageDto;

  @ApiPropertyOptional({ type: () => HashedMessageSchema })
  @IsOptional()
  @ValidateNested()
  @Type(() => HashedMessageSchema)
  hashedMessage?: HashedMessage;

  @ApiProperty({ enum: ["local", "remote"] })
  @IsEnum(["local", "remote"])
  type!: "local" | "remote";
}

export class NegotiationStatusDto {
  @ApiProperty()
  @IsString()
  localId!: string;

  @ApiProperty()
  @IsString()
  remoteId!: string;

  @ApiProperty()
  @IsString()
  remoteParty!: string;

  @ApiProperty({ enum: ["provider", "consumer"] })
  @IsEnum(["provider", "consumer"])
  role!: NegotiationRole;

  @ApiProperty()
  @IsString()
  remoteAddress!: string;

  @ApiProperty({ enum: ContractNegotiationState })
  @IsEnum(ContractNegotiationState)
  state!: ContractNegotiationState;

  @ApiProperty()
  @IsString()
  dataSet!: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  modifiedDate!: Date;
}

export class NegotiationDetailDto extends NegotiationStatusDto {
  @ApiPropertyOptional({ type: () => OfferSchema })
  @IsOptional()
  @ValidateNested()
  @Type(() => OfferSchema)
  offer?: OfferDto;

  @ApiPropertyOptional({ type: () => AgreementSchema })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgreementSchema)
  agreement?: AgreementDto;

  @ApiProperty({ type: () => [NegotiationProcessEventDto] })
  @ValidateNested({ each: true })
  @Type(() => NegotiationProcessEventDto)
  events!: Array<NegotiationProcessEventDto>;
}
