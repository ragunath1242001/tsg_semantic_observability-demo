import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumberString, IsString } from "class-validator";

export class CredentialStatusRequest {
  @ApiProperty()
  @IsString()
  statusListCredential!: string;

  @ApiProperty()
  @IsNumberString()
  statusListIndex!: string;
}

export class VerifiedCredentialStatus {
  @ApiProperty()
  @IsString()
  statusListCredential!: string;

  @ApiProperty()
  @IsNumberString()
  statusListIndex!: string;

  @ApiProperty({
    type: "string",
    enum: ["refresh", "revocation", "suspension", "message"]
  })
  @IsEnum(["refresh", "revocation", "suspension", "message"])
  statusPurpose!: "refresh" | "revocation" | "suspension" | "message";

  @ApiProperty()
  @IsBoolean()
  status!: boolean;
}
