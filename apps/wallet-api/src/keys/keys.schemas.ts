import { KeyInfo } from "@tsg-dsp/wallet-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JWK } from "jose";
import { JsonWebKeyDto } from "@tsg-dsp/common-dtos";
import { InitKeyConfig } from "../config.js";

export class KeyInfoDto implements KeyInfo {
  @ApiProperty()
  id!: string;
  @ApiProperty({ enum: ["EdDSA", "ES384", "X509"], enumName: "KeyType" })
  type!: "EdDSA" | "ES384" | "X509";
  @ApiProperty()
  default!: boolean;
  @ApiProperty({ type: () => JsonWebKeyDto })
  publicKey!: JWK;
  @ApiProperty()
  created!: Date;
  @ApiProperty()
  modified!: Date;
}

export class KeyConfigDto implements InitKeyConfig {
  @ApiProperty({ enum: ["EdDSA", "ES384", "X509"], enumName: "KeyType" })
  type!: "EdDSA" | "ES384" | "X509";
  @ApiProperty()
  id!: string;
  @ApiProperty()
  default!: boolean;
  @ApiPropertyOptional()
  existingKey?: string;
  @ApiPropertyOptional()
  existingCertificate?: string;
}
