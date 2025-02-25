import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CredentialAddress {
  @ApiProperty({ type: String, example: "did:web:example134234" })
  @IsString()
  didId!: string;

  @ApiProperty({ type: String, example: "https://example.com/" })
  @IsString()
  address!: string;
}
