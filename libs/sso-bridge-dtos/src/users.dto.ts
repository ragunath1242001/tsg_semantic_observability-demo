import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString
} from "class-validator";

import { GrantType } from "./grants.js";

export class UserDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: "johndoe" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: "johndoe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: ["admin", "user"] })
  @IsArray()
  @IsNotEmpty()
  roles!: string[];

  @ApiProperty({ example: ["read", "write"] })
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  require2FA?: boolean;
}

export class UserWithPasswordDto extends UserDto {
  @ApiProperty({ example: "strongpassword123" })
  @IsString()
  @IsOptional()
  password?: string;
}
