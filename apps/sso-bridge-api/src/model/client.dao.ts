import { OwnableEntity } from "@tsg-dsp/common-api";
import { PermissionString, Resource } from "@tsg-dsp/common-dtos";
import { ClientAuthMethod, GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Column, Entity } from "typeorm";

@Entity()
export class OauthClient extends OwnableEntity {
  readonly resourceType = Resource.SSO_CLIENT;

  @Column({ type: String, nullable: true })
  secretName?: string;

  @Column({ type: String })
  clientId!: string;

  @Column({ type: String, nullable: true })
  clientSecret?: string;

  @Column({ type: String, default: "client_secret_post" })
  tokenEndpointAuthMethod: ClientAuthMethod = "client_secret_post";

  @Column({ type: "simple-json", nullable: true })
  jwk?: Record<string, any>;

  /**
   * Permissions assigned to this client.
   * These are stored as simple strings in format "action:resource" or "action:resource:scope".
   */
  @Column("simple-array", { default: "" })
  permissions!: PermissionString[];

  @Column("simple-array")
  grants!: GrantType[];

  @Column({ type: String })
  name!: string;

  @Column({ type: String })
  description!: string;

  @Column({ type: "simple-json" })
  redirectUris!: string[];
}
