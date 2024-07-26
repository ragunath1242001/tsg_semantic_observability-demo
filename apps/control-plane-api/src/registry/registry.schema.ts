import { CredentialAddress } from "@tsg-dsp/control-plane-dtos";
import { ApiProperty } from "@nestjs/swagger";

export class CredentialAddressDto implements CredentialAddress {
  @ApiProperty()
  didId!: string;
  @ApiProperty()
  address!: string;
}
