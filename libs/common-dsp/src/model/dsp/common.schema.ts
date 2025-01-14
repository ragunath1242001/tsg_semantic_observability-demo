import { ApiProperty } from "@nestjs/swagger";
import { ReferenceDto, MultilanguageDto, DurationDto } from "./common.dto.js";

export class ReferenceSchema implements ReferenceDto {
  @ApiProperty({ type: "string" })
  "@id"!: string;
}

export class MultilanguageSchema implements MultilanguageDto {
  @ApiProperty()
  "@value"!: string;

  @ApiProperty()
  "@language"!: string;
}

export class DurationSchema implements DurationDto {
  @ApiProperty()
  "@value"!: string;
  @ApiProperty()
  "@type": "xsd:duration";
}
