import { ApiProperty } from "@nestjs/swagger";
import { PresentationDefinition } from "@tsg-dsp/common-dtos";
import { Type } from "class-transformer";
import {
  IsString,
  IsUUID,
  registerDecorator,
  ValidateNested,
  ValidationOptions
} from "class-validator";

export class ScopeDto {
  @ApiProperty({ example: "00000000-0000-0000-0000-000000000000" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "nl.tsg.example-scope" })
  @IsString()
  alias!: string;

  @ApiProperty({ example: "{scopeVar}" })
  @IsString()
  discriminator!: string;

  @ApiProperty({ example: "An example scope" })
  @IsString()
  description!: string;

  @ApiProperty({ type: () => PresentationDefinition })
  @ValidateNested()
  @Type(() => PresentationDefinition)
  presentationDefinition!: PresentationDefinition;
}

export function Description(
  description: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "description",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [description],
      options: validationOptions,
      validator: {
        validate() {
          return true;
        }
      }
    });
  };
}

export class AddScope {
  @ApiProperty({ example: "nl.tsg.example-scope" })
  @Description("Alias of the scope")
  @IsString()
  public readonly alias!: string;

  @ApiProperty({ example: "{scopeVar}" })
  @Description("Discriminator of the scope, variables must be enclosed in {}")
  @IsString()
  public readonly discriminator!: string;

  @ApiProperty({ example: "An example scope" })
  @Description("Description of the scope")
  @IsString()
  public readonly description!: string;

  @ApiProperty({ type: () => PresentationDefinition })
  @Description(
    "Presentation definition associated with the scope, should include variables from the discriminator"
  )
  @ValidateNested()
  @Type(() => PresentationDefinition)
  public readonly presentationDefinition!: PresentationDefinition;
}
