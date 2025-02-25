import { KeyInfo } from "@tsg-dsp/wallet-dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JWK } from "jose";
import { JsonWebKeyDto } from "@tsg-dsp/common-dtos";
import { InitKeyConfig } from "../config.js";

export class KeyInfoDto implements KeyInfo {
  @ApiProperty({ example: "b86483f3-3792-4a54-b11e-f1c6face9935" })
  id!: string;

  @ApiProperty({
    enum: ["EdDSA", "ES384", "X509"],
    enumName: "KeyType",
    example: "EdDSA"
  })
  type!: "EdDSA" | "ES384" | "X509";

  @ApiProperty({ example: true })
  default!: boolean;

  @ApiProperty({
    type: () => JsonWebKeyDto,
    example: {
      kty: "RSA",
      e: "AQAB",
      n: "0vx7agoebGcQSuuPiLJXZptN9nndrmyq0ctuV5m"
    }
  })
  publicKey!: JWK;

  @ApiProperty({ example: "2025-02-21T10:26:42.206Z" })
  created!: Date;

  @ApiProperty({ example: "2025-02-21T10:26:42.206Z" })
  modified!: Date;
}

export class KeyConfigDto implements InitKeyConfig {
  @ApiProperty({
    enum: ["EdDSA", "ES384", "X509"],
    enumName: "KeyType",
    example: "ES384"
  })
  type!: "EdDSA" | "ES384" | "X509";

  @ApiProperty({ example: "b86483f3-3792-4a54-b11e-f1c6face9935" })
  id!: string;

  @ApiProperty({ example: false })
  default!: boolean;

  @ApiPropertyOptional({ example: "existingKey789" })
  existingKey?: string;

  @ApiPropertyOptional({ example: "existingCert101112" })
  existingCertificate?: string;
}
