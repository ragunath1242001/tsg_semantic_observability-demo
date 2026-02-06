import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiProperty({
    example: "2023-10-11T00:00:00.000Z"
  })
  @IsDate()
  @Type(() => Date)
  time!: Date;

  @ApiProperty({
    enum: ContractNegotiationState,
    example: Object.values(ContractNegotiationState)[0]
  })
  @IsEnum(ContractNegotiationState)
  state!: ContractNegotiationState;

  @ApiPropertyOptional({
    example: "A local message example"
  })
  @IsOptional()
  @IsString()
  localMessage?: string;

  @ApiPropertyOptional({
    example: "ERR_CODE"
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    type: () => [MultilanguageSchema],
    example: []
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MultilanguageSchema)
  reason?: MultilanguageDto[];

  @ApiPropertyOptional({
    example: "Agreement reached on event"
  })
  @IsOptional()
  @IsString()
  agreementMessage?: string;

  @ApiPropertyOptional({
    type: () => ContractAgreementVerificationMessageSchema,
    example: {} // add a valid ContractAgreementVerificationMessageDto example if available
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractAgreementVerificationMessageSchema)
  verification?: ContractAgreementVerificationMessageDto;

  @ApiPropertyOptional({
    type: () => HashedMessageSchema,
    example: {} // add a valid HashedMessage example if available
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HashedMessageSchema)
  hashedMessage?: HashedMessage;

  @ApiProperty({
    enum: ["local", "remote"],
    example: "local"
  })
  @IsEnum(["local", "remote"])
  type!: "local" | "remote";
}

export class NegotiationStatusDto {
  @ApiProperty({
    example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  })
  @IsString()
  id!: string;

  @ApiProperty({
    example: "3fa85f64-5717-4562-b3fc-2c963f66afa7"
  })
  @IsString()
  remoteId!: string;

  @ApiProperty({
    example: "Remote Party Name"
  })
  @IsString()
  remoteParty!: string;

  @ApiProperty({
    enum: ["provider", "consumer"],
    example: "provider"
  })
  @IsEnum(["provider", "consumer"])
  role!: NegotiationRole;

  @ApiProperty({
    example: "192.168.1.100"
  })
  @IsString()
  remoteAddress!: string;

  @ApiProperty({
    enum: ContractNegotiationState,
    example: Object.values(ContractNegotiationState)[0]
  })
  @IsEnum(ContractNegotiationState)
  state!: ContractNegotiationState;

  @ApiProperty({
    example: "defaultDataSet"
  })
  @IsString()
  dataSet!: string;

  @ApiProperty({
    example: "2023-10-11T00:00:00.000Z"
  })
  @IsDate()
  @Type(() => Date)
  modifiedDate!: Date;
}

export class NegotiationDetailDto extends NegotiationStatusDto {
  @ApiPropertyOptional({
    type: () => OfferSchema,
    example: {} // add a valid OfferDto example if available
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OfferSchema)
  offer?: OfferDto;

  @ApiPropertyOptional({
    type: () => AgreementSchema,
    example: {} // add a valid AgreementDto example if available
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgreementSchema)
  agreement?: AgreementDto;

  @ApiProperty({
    type: () => [NegotiationProcessEventDto]
  })
  @ValidateNested({ each: true })
  @Type(() => NegotiationProcessEventDto)
  events!: Array<NegotiationProcessEventDto>;
}
