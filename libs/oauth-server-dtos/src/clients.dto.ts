import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsArray } from "class-validator";
import { GrantType } from "./grants.js";

export class ClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  roles!: string[];

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];
}
