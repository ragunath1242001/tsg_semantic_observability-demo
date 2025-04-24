import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class RoleDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: "user" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "Regular user role with limited access" })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
