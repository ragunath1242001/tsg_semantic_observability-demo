import {
  DurationDto,
  MultilanguageDto,
  ReferenceDto,
} from "@tsg-dsp/common-dsp";
import { ApiProperty } from "@nestjs/swagger";

export class ReferenceSchema implements ReferenceDto {
  @ApiProperty()
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
