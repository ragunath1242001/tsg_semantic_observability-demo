import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional
} from "class-validator";
import { GrantType } from "./grants.js";

export class UserDto {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  roles!: string[];

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];
}
