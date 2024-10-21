import { ApiProperty } from "@nestjs/swagger";
import { ClientInfo } from "./roles.guard";

export class ClientInfoDto implements ClientInfo {
  @ApiProperty()
  sub!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty({ type: [String] })
  roles!: string[];

  refreshToken?: string;
}

export class AuthenticatedUserDto {
  @ApiProperty()
  state = "authenticated" as const;

  @ApiProperty()
  user!: ClientInfoDto;
}

export class UnauthenticatedUserDto {
  @ApiProperty()
  state = "unauthenticated" as const;
}
