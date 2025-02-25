import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumberString, IsString } from "class-validator";

export class CredentialStatusRequest {
  @ApiProperty({
    example: "credential-identifier-123"
  })
  @IsString()
  statusListCredential!: string;

  @ApiProperty({
    example: "1"
  })
  @IsNumberString()
  statusListIndex!: string;

  @ApiPropertyOptional({
    example: "Additional optional data"
  })
  @IsString()
  optionalField?: string;
}

export class VerifiedCredentialStatus {
  @ApiProperty({
    example: "credential-identifier-123"
  })
  @IsString()
  statusListCredential!: string;

  @ApiProperty({
    example: "1"
  })
  @IsNumberString()
  statusListIndex!: string;

  @ApiProperty({
    example: "refresh",
    enum: ["refresh", "revocation", "suspension", "message"]
  })
  @IsEnum(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty({
    example: true
  })
  @IsBoolean()
  status!: boolean;

  @ApiPropertyOptional({
    example: "Optional verification message"
  })
  @IsString()
  message?: string;
}
