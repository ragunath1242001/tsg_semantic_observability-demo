import { IsBoolean, IsDate, IsIn, IsObject, IsString } from "class-validator";
import { JWK } from "jose";

export class KeyInfo {
  @IsString()
  id!: string

  @IsString()
  @IsIn(['EdDSA','ES384','X509'])
  type!: 'EdDSA' | 'ES384' | 'X509'

  @IsBoolean()
  default!: boolean

  @IsObject()
  publicKey!: JWK

  @IsDate()
  created!: Date

  @IsDate()
  modified!: Date
}
