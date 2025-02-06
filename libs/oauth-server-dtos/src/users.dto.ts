import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsArray } from "class-validator";
import { GrantType } from "./grants.js";

export class UserDto {
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
