import {
  ComplianceRequest,
  LegalRegistrationNumberRequest,
} from "@tsg-dsp/wallet-dtos";
import { ApiProperty } from "@nestjs/swagger";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import {
  DefaultCredentialSubjectDto,
  VerifiableCredentialDto,
} from "../credentials.schemas.js";

export class LegalRegistrationNumberRequestDto
  implements LegalRegistrationNumberRequest
{
  @ApiProperty()
  vcId!: string;
  @ApiProperty()
  clearingHouse!: string;
  @ApiProperty({ type: DefaultCredentialSubjectDto })
  credentialSubject!: CredentialSubject;
}

export class ComplianceRequestDto implements ComplianceRequest {
  @ApiProperty()
  vcId!: string;
  @ApiProperty()
  clearingHouse!: string;
  @ApiProperty({ type: [VerifiableCredentialDto] })
  credentials!: VerifiableCredential[];
}
