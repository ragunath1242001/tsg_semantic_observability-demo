import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsEmail
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

  @ApiProperty({ example: "secretpassword" })
  @IsString()
  @IsNotEmpty()
  password!: string;

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
}
