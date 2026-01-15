import { ClientAuthMethod, GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Transform } from "class-transformer";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { MetaEntity } from "./common.dao.js";
import { OauthRole } from "./role.dao.js";

@Entity()
export class OauthClient extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  secretName!: string;

  @Column({ type: String })
  clientId!: string;

  @Column({ type: String, nullable: true })
  clientSecret?: string;

  @Column({ type: String, default: "client_secret_post" })
  tokenEndpointAuthMethod: ClientAuthMethod = "client_secret_post";

  @Column({ type: "simple-json", nullable: true })
  jwk?: Record<string, any>;

  @ManyToMany(() => OauthRole, { eager: true })
  @JoinTable()
  @Transform(
    ({ value }) => {
      return value?.map((role: OauthRole) => role.name) || [];
    },
    { toPlainOnly: true }
  )
  roles!: OauthRole[];

  @Column("simple-array")
  grants!: GrantType[];

  @Column({ type: String })
  name!: string;

  @Column({ type: String })
  description!: string;

  @Column({ type: "simple-json" })
  redirectUris!: string[];
}
