import {
  AccessToken,
  AuthorizationCode,
  AuthorizationDetail,
  CredentialConfiguration,
  CredentialDefinition,
  CredentialIssuerMetadata,
  CredentialOffer,
  CredentialOfferStatus,
  CredentialRequest,
  CwtProof,
  DataIntegrityProof,
  DeferredCredentialResponse,
  ImmediateCredentialResponse,
  JwtProof,
  LdpVpProof,
  LogoDisplay,
  PreAuthorizationCodeGrant,
  VpProof,
} from "@tsg-dsp/wallet-dtos";
// This needs to be separate since it's an enum. https://stackoverflow.com/questions/38553097/how-to-import-an-enum
import { OfferGrants } from "@tsg-dsp/wallet-dtos";
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import { CredentialSubject } from "@tsg-dsp/common-dsp";
import { DefaultCredentialSubjectDto } from "../credentials/credentials.schemas.js";

export class CredentialIssuerMetadataDto implements CredentialIssuerMetadata {
  @ApiProperty()
  credential_issuer!: string;
  @ApiPropertyOptional()
  authorization_servers?: string[];
  @ApiPropertyOptional()
  token_endpoint?: string;
  @ApiProperty()
  credential_endpoint!: string;
  @ApiPropertyOptional()
  batch_credential_endpoint?: string;
  @ApiPropertyOptional()
  deferred_credential_endpoint?: string;
  @ApiPropertyOptional()
  notification_endpoint?: string;
  @ApiPropertyOptional()
  credential_response_encryption?: {
    alg_values_supported: string[];
    enc_values_supported: string[];
    encryption_required: boolean;
  };
  @ApiPropertyOptional()
  credential_identifiers_supported?: boolean;
  @ApiPropertyOptional()
  signed_metadata?: string;
  @ApiPropertyOptional()
  display?: LogoDisplay[];
  @ApiProperty()
  credential_configurations_supported!: {
    [id: string]: CredentialConfiguration;
  };
}

export class AuthorizationDetailDto implements AuthorizationDetail {
  @ApiProperty()
  type!: "openid_credential";
  @ApiProperty()
  credential_configuration_id!: string;
  @ApiProperty()
  credential_identifiers!: string[];
}

export class AccessTokenDto implements AccessToken {
  @ApiProperty()
  access_token!: string;
  @ApiPropertyOptional()
  token_type?: string;
  @ApiPropertyOptional()
  expires_in?: number;
  @ApiPropertyOptional()
  refresh_token?: string;
  @ApiPropertyOptional()
  c_nonce?: string;
  @ApiPropertyOptional()
  c_nonce_expires_in?: number;
  @ApiProperty({ type: [AuthorizationDetailDto] })
  authorization_details!: AuthorizationDetail[];
}

export class JwtProofDto implements JwtProof {
  @ApiProperty({ pattern: "jwt" })
  proof_type!: "jwt";
  @ApiProperty()
  jwt!: string;
}
export class CwtProofDto implements CwtProof {
  @ApiProperty({ pattern: "cbt" })
  proof_type!: "cbt";
  @ApiProperty()
  cbt!: string;
}

export class VpProofDto implements VpProof {
  @ApiProperty()
  "@context"!: string[];
  @ApiProperty()
  type!: string[];
  @ApiProperty()
  holder!: string;
  @ApiProperty()
  proof!: DataIntegrityProof;
}
export class LdpVpProofDto implements LdpVpProof {
  @ApiProperty({ pattern: "ldp_vp" })
  proof_type!: "ldp_vp";
  @ApiProperty({ type: VpProofDto })
  ldp_vp!: VpProof;
}

@ApiExtraModels(JwtProofDto, CwtProofDto, LdpVpProofDto)
export class CredentialRequestDto implements CredentialRequest {
  @ApiProperty({ pattern: "jwt_vc_json-ld" })
  format!: "jwt_vc_json-ld";
  @ApiProperty()
  credential_definition!: CredentialDefinition;
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(JwtProofDto) },
      { $ref: getSchemaPath(CwtProofDto) },
      { $ref: getSchemaPath(LdpVpProofDto) },
    ],
  })
  proof!: JwtProof | CwtProof | LdpVpProof;
}

export class ImmediateCredentialResponseDto
  implements ImmediateCredentialResponse
{
  @ApiProperty()
  credential!: string;
  @ApiPropertyOptional()
  c_nonce?: string;
  @ApiPropertyOptional()
  c_nonce_expires_in?: number;
}
export class DeferredCredentialResponseDto
  implements DeferredCredentialResponse
{
  @ApiProperty()
  transaction_id!: string;
  @ApiPropertyOptional()
  c_nonce?: string;
  @ApiPropertyOptional()
  c_nonce_expires_in?: number;
}

export class CredentialOfferStatusDto implements CredentialOfferStatus {
  @ApiProperty()
  id!: number;
  @ApiProperty()
  created!: Date;
  @ApiProperty()
  preAuthorizedCode!: string;
  @ApiProperty()
  holderId!: string;
  @ApiProperty()
  credentialType!: string;
  @ApiPropertyOptional()
  credentialId?: string;
  @ApiProperty()
  revoked!: boolean;
  @ApiProperty({ type: DefaultCredentialSubjectDto })
  credentialSubject!: CredentialSubject;
}

export class PreAuthorizationCodeGrantDto implements PreAuthorizationCodeGrant {
  @ApiProperty()
  "pre-authorization_code": string;
  @ApiPropertyOptional()
  authorization_server?: string;
  @ApiPropertyOptional()
  interval?: number;
  @ApiPropertyOptional()
  tx_code?: {
    input_mode?: "numeric" | "text";
    length?: number;
    description?: string;
  };
}

export class AuthorizationCodeDto implements AuthorizationCode {
  @ApiPropertyOptional()
  authorization_server?: string;
  @ApiPropertyOptional()
  issuer_state?: string;
}

export class OfferGrantsDto {
  @ApiPropertyOptional({ type: PreAuthorizationCodeGrantDto })
  [OfferGrants.PRE_AUTHORIZATION_CODE]?: PreAuthorizationCodeGrant;
  @ApiPropertyOptional({ type: AuthorizationCodeDto })
  [OfferGrants.AUTHORIZATION_CODE]?: AuthorizationCode;
}

export class CredentialOfferDto implements CredentialOffer {
  @ApiProperty()
  credential_issuer!: string;
  @ApiProperty()
  credential_configuration_ids!: string[];
  @ApiPropertyOptional()
  grants?: OfferGrantsDto;
}
