import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class ClientInfo {
  @ApiProperty({ example: "user-id-123" })
  @IsString()
  sub!: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "did:example:123456789" })
  @IsString()
  @IsOptional()
  didId?: string;

  @ApiProperty({ type: [String], example: ["admin", "user"] })
  @IsString({ each: true })
  roles!: string[];

  @ApiPropertyOptional({ example: "refresh-token-abc123" })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class AuthenticatedUser {
  @ApiProperty({ example: "authenticated" })
  state = "authenticated" as const;

  @ApiProperty({
    example: {
      sub: "user-id-123",
      name: "John Doe",
      email: "john.doe@example.com",
      roles: ["admin", "user"],
      didId: "did:example:123456789",
      refreshToken: "refresh-token-abc123"
    }
  })
  user!: ClientInfo;
}

export class UnauthenticatedUser {
  @ApiProperty({ example: "unauthenticated" })
  state = "unauthenticated" as const;
}
