import { OwnableEntity } from "@tsg-dsp/common-api";
import { PermissionString, Resource } from "@tsg-dsp/common-dtos";
import { GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Column, Entity } from "typeorm";

/**
 * Note: This entity uses auto-generated numeric id.
 * Extends OwnableBase for ABAC support.
 */
@Entity()
export class OauthUser extends OwnableEntity {
  readonly resourceType = Resource.SSO_USER;

  @Column({ type: String })
  username!: string;

  @Column({ type: String })
  password!: string;

  @Column({ type: String })
  email!: string;

  @Column({ type: Boolean, default: false })
  require2FA!: boolean;

  /**
   * Permissions assigned to this user.
   * These are stored as simple strings in format "action:resource" or "action:resource:scope".
   */
  @Column("simple-array", { default: "" })
  permissions!: PermissionString[];

  @Column("simple-array")
  grants!: GrantType[];
}
