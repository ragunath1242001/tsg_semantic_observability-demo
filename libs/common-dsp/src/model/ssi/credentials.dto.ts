import { Type } from "class-transformer";
import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { OrArray } from "../../utils/unions";

export abstract class Proof {
  type: "JsonWebSignature2020" | "DataIntegrityProof";
  proofPurpose: string;
}

export class JsonWebSignature2020 extends Proof {
  @IsString()
  type!: "JsonWebSignature2020";
  @IsDateString()
  created!: string;
  @IsString()
  proofPurpose!: string;
  @IsString()
  jws!: string;
  @IsString()
  verificationMethod!: string;
}

export class DataIntegrityProof extends Proof {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  type!: "DataIntegrityProof";
  @IsString()
  proofPurpose!: string;
  @IsString()
  @IsOptional()
  verificationMethod?: string;
  @IsString()
  cryptosuite!:
    | "eddsa-rdfc-2022"
    | "eddsa-jcs-2022"
    | "ecdsa-rdfc-2019"
    | "ecdsa-jcs-2019"
    | "RSASSA-PSS"
    | string;
  @IsDateString()
  @IsOptional()
  created?: string;
  @IsDateString()
  @IsOptional()
  expires?: string;
  @IsString({ each: true })
  @IsOptional()
  domain?: OrArray<string>;
  @IsString()
  @IsOptional()
  challenge?: string;
  @IsString()
  proofValue!: string;
  @IsString({ each: true })
  @IsOptional()
  previousProof?: OrArray<string>;
  @IsString()
  @IsOptional()
  nonce?: string;
}

export class CredentialSubject {
  @IsString()
  id!: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any;
}

export class Credential<T extends CredentialSubject = CredentialSubject> {
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
  @Type(() => CredentialSubject)
  credentialSubject!: OrArray<T>;
  @IsString()
  issuer!: string;
  @IsString()
  @IsOptional()
  expirationDate?: string;
  @IsString()
  issuanceDate!: string;
  @IsOptional()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  evidence?: any;
}

export class VerifiableCredential<
  P extends Proof = Proof,
  T extends CredentialSubject = CredentialSubject
> extends Credential<T> {
  @ValidateNested()
  @Type(() => Proof, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: JsonWebSignature2020, name: "JsonWebSignature2020" },
        { value: DataIntegrityProof, name: "DataIntegrityProof" }
      ]
    },
    keepDiscriminatorProperty: true
  })
  proof!: OrArray<P>;
}
