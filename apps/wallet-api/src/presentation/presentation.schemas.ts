import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  CredentialSubject,
  PresentationValidation,
  VerifiableCredential,
  VerifiablePresentation,
  VerifiablePresentationJsonLd,
  VerifiablePresentationJwt,
} from "@libs/common-dsp";
import { elementOrArray } from "../did/did.schemas.js";
import {
  Constraint,
  DescriptorMap,
  Field,
  Filter,
  Format,
  InputDescriptor,
  PresentationDefinition,
  PresentationResponse,
  PresentationSubmission,
} from "@libs/wallet-dtos";
import { VerifiableCredentialDto } from "../credentials/credentials.schemas.js";

export class VerifiablePresentationDto
  implements VerifiablePresentation<VerifiableCredential<CredentialSubject>>
{
  @ApiProperty()
  "@context"!: string[];
  @ApiProperty()
  type!: string[];
  @ApiPropertyOptional()
  id?: string;
  @ApiProperty(elementOrArray({ $ref: getSchemaPath(VerifiableCredentialDto) }))
  verifiableCredential!:
    | VerifiableCredential<CredentialSubject>[]
    | VerifiableCredential<CredentialSubject>;
}

export class VerifiablePresentationJsonLdDto
  implements VerifiablePresentationJsonLd
{
  @ApiProperty({ type: VerifiableCredentialDto })
  vp!: VerifiablePresentation<VerifiableCredential<CredentialSubject>>;
}

export class VerifiablePresentationJwtDto implements VerifiablePresentationJwt {
  @ApiProperty()
  vp!: string;
}

export class PresentationValidationDto implements PresentationValidation {
  @ApiProperty()
  valid!: boolean;
  @ApiProperty()
  validateJWTSignature!: boolean;
  @ApiProperty()
  validateJWTExpiryDate!: boolean;
  @ApiProperty({ type: [Boolean] })
  validateTrustAnchors!: boolean[];
  @ApiProperty()
  @ApiProperty({ type: [Boolean] })
  validateExpiryDate!: (boolean | "undefined")[];
  @ApiProperty()
  @ApiProperty({ type: [Boolean] })
  validateCredentials!: boolean[];
  @ApiPropertyOptional()
  validateAudience?: boolean;
  @ApiProperty()
  vp!: string;
}

export class FormatDto implements Format {
  @ApiPropertyOptional({
    type: "object",
    properties: {
      alg: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  })
  jwt_vp?: { alg: string[] };
}

export class FieldDto implements Field {
  @ApiProperty()
  path!: string[];
  @ApiPropertyOptional()
  id?: string;
  @ApiPropertyOptional()
  purpose?: string;
  @ApiPropertyOptional()
  name?: string;
  @ApiPropertyOptional()
  filter?: Filter;
  @ApiPropertyOptional()
  optional?: boolean;
}

export class ConstraintDto implements Constraint {
  @ApiPropertyOptional({ type: [FieldDto] })
  fields?: Field[];
  @ApiPropertyOptional({ enum: ["required", "preferred"] })
  limit_disclosure?: "required" | "preferred";
}

export class InputDescriptorDto implements InputDescriptor {
  @ApiProperty()
  id!: string;
  @ApiPropertyOptional()
  name?: string;
  @ApiPropertyOptional()
  purpose?: string;
  @ApiPropertyOptional({ type: FormatDto })
  format?: Format;
  @ApiProperty({ type: ConstraintDto })
  constraints!: Constraint;
}

export class PresentationDefinitionDto implements PresentationDefinition {
  @ApiProperty()
  id!: string;
  @ApiProperty({ type: [InputDescriptorDto] })
  input_descriptors!: InputDescriptor[];
  @ApiPropertyOptional()
  name?: string;
  @ApiPropertyOptional()
  purpose?: string;
  @ApiPropertyOptional({ type: FormatDto })
  format?: Format;
}

export class DescriptorMapDto implements DescriptorMap {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  format!: string;
  @ApiProperty()
  path!: string;
  @ApiPropertyOptional({ type: () => DescriptorMapDto })
  path_nested?: DescriptorMap;
}

export class PresentationSubmissionDto implements PresentationSubmission {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  definition_id!: string;
  @ApiProperty({ type: [DescriptorMapDto] })
  descriptor_map!: DescriptorMap[];
}

export class PresentationResponseDto implements PresentationResponse {
  @ApiProperty()
  vp_token!: string;
  @ApiProperty({ type: PresentationSubmissionDto })
  presentation_submission!: PresentationSubmission;
}

export class VerificationRequestDto {
  @ApiProperty({ type: PresentationDefinitionDto })
  presentationDefinition!: PresentationDefinition;
  @ApiProperty()
  holderIdToken!: string;
}
