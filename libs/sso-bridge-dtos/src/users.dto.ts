import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType
} from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString
} from "class-validator";

import { GrantType } from "./grants.js";

export class UserDto {
  @ApiPropertyOptional({ example: "1" })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: "johndoe" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: "johndoe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: ["manage:user", "read:config"],
    description:
      "User permissions (can be permission strings or permission set names)"
  })
  @IsArray()
  @IsNotEmpty()
  permissions!: string[];

  @ApiProperty({ example: ["read", "write"] })
  @IsArray()
  @IsNotEmpty()
  grants!: GrantType[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  require2FA?: boolean;
}

export class UserWithPasswordDto extends UserDto {
  @ApiPropertyOptional({ example: "strongpassword123" })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateUserDto extends OmitType(UserWithPasswordDto, [
  "id"
] as const) {}

export class UpdateUserDto extends PartialType(
  OmitType(UserWithPasswordDto, ["id"] as const)
) {}

export class ChangePasswordDto {
  @ApiProperty({ example: "currentpassword123" })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: "newpassword456" })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
