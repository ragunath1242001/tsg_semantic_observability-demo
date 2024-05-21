import { AppRole, ClientInfo } from "@libs/dtos";
import { ApiExtraModels, ApiProperty } from "@nestjs/swagger";

export class ClientInfoDto implements ClientInfo {
  @ApiProperty()
  sub!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  didId!: string;
  @ApiProperty({ type: [String], enum: AppRole, enumName: "AppRole" })
  roles!: AppRole[];

  refreshToken?: string;
}

export class AuthenticatedUserDto {
  @ApiProperty()
  state: "authenticated" = "authenticated";

  @ApiProperty()
  user!: ClientInfoDto;
}

export class UnauthenticatedUserDto {
  @ApiProperty()
  state: "unauthenticated" = "unauthenticated";
}
