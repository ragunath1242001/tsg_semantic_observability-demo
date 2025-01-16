import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class ClientInfo {
  @ApiProperty()
  @IsString()
  sub!: string;
  @ApiProperty()
  @IsString()
  name!: string;
  @ApiProperty()
  @IsEmail()
  email!: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  didId?: string;
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  roles!: String[];
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class AuthenticatedUser {
  @ApiProperty()
  state: "authenticated" = "authenticated";

  @ApiProperty()
  user!: ClientInfo;
}

export class UnauthenticatedUser {
  @ApiProperty()
  state: "unauthenticated" = "unauthenticated";
}
