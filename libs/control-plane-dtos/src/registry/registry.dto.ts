import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CredentialAddress {
  @ApiProperty({ type: String })
  @IsString()
  didId!: string;

  @ApiProperty({ type: String })
  @IsString()
  address!: string;
}
