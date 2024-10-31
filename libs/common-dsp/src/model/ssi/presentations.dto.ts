import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsIn,
} from "class-validator";
import {
  VerifiableCredential,
  DataIntegrityProof,
  JsonWebSignature2020,
  Proof,
} from "./credentials.dto";
import { OrArray } from "../../utils/unions";

export class VerifiablePresentation<
  T extends VerifiableCredential = VerifiableCredential,
  P extends Proof = Proof,
> {
  @IsString({ each: true })
  "@context": (
    | "https://www.w3.org/2018/credentials/v1"
    | "https://www.w3.org/ns/credentials/v2"
    | "https://w3id.org/security/suites/jws-2020/v1"
    | "https://w3id.org/security/data-integrity/v2"
    | string
  )[];
  @IsString({ each: true })
  type!: string[];
  @IsString()
  @IsOptional()
  id?: string;
  @ValidateNested()
  @Type(() => VerifiableCredential)
  verifiableCredential!: OrArray<T>;

  @ValidateNested()
  @IsOptional()
  @Type(() => Proof, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: JsonWebSignature2020, name: "JsonWebSignature2020" },
        { value: DataIntegrityProof, name: "DataIntegrityProof" },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  proof?: OrArray<P>;
}

export class VerifiablePresentationJwt {
  @IsString()
  vp!: string;
}

export class VerifiablePresentationJsonLd {
  @ValidateNested()
  @Type(() => VerifiablePresentation)
  vp!: VerifiablePresentation;
}

export class PresentationValidation extends VerifiablePresentationJwt {
  @IsBoolean()
  valid!: boolean;

  @IsBoolean()
  validateJWTSignature!: boolean;

  @IsBoolean()
  validateJWTExpiryDate!: boolean;

  @IsBoolean({ each: true })
  validateTrustAnchors!: Array<boolean>;

  @IsIn([true, false, "undefined"])
  validateExpiryDate!: Array<boolean | "undefined">;

  @IsBoolean({ each: true })
  validateCredentials!: Array<boolean>;

  @IsBoolean()
  @IsOptional()
  validateAudience?: boolean;
}
