import { ApiProperty } from "@nestjs/swagger";

import { DurationDto, MultilanguageDto, ReferenceDto } from "./common.dto.js";

export class ReferenceSchema implements ReferenceDto {
  @ApiProperty({
    type: "string",
    example: "3f2592da-ffc9-40cb-a336-a9daa9343ce8"
  })
  "@id"!: string;
}

export class MultilanguageSchema implements MultilanguageDto {
  @ApiProperty({ example: "This is a sentence." })
  "@value"!: string;

  @ApiProperty({ example: "en" })
  "@language"!: string;
}

export class DurationSchema implements DurationDto {
  @ApiProperty({ example: "P3Y6M4DT12H30M5S" })
  "@value"!: string;
  @ApiProperty({ example: "xsd:duration" })
  "@type": "xsd:duration";
}
