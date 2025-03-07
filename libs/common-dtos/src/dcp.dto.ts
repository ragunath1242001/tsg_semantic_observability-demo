import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { VerifiablePresentation } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  ArrayContains,
  ArrayMinSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

import { PresentationDefinition } from "./presentationdefinition.dto.js";

export class VerificationRequest {
  @ApiProperty({ type: () => PresentationDefinition })
  @ValidateNested()
  @Type(() => PresentationDefinition)
  presentationDefinition!: PresentationDefinition;
  @ApiProperty()
  @IsString()
  holderIdToken!: string;
}

export class PresentationQueryMessage {
  @ApiProperty()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "PresentationQueryMessage" })
  @IsString()
  @Equals("PresentationQueryMessage")
  type!: "PresentationQueryMessage";

  @ApiPropertyOptional({ type: () => PresentationDefinition })
  @IsOptional()
  @ValidateNested()
  @Type(() => PresentationDefinition)
  presentationDefinition?: PresentationDefinition;

  @ApiPropertyOptional({
    type: [String],
    example: ["https://example.com/credential-1"]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];
}

@ApiExtraModels(VerifiablePresentation)
export class PresentationResponseMessage {
  @ApiProperty({ example: ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"] })
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayContains(["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"])
  "@context": string[];

  @ApiProperty({ example: "PresentationResponseMessage" })
  @IsString()
  @Equals("PresentationResponseMessage")
  type!: "PresentationResponseMessage";

  @ApiProperty({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerifiablePresentation) }
      ]
    }
  })
  @IsArray()
  presentation!: (string | object)[];
}
