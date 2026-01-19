import { GrantType } from "@tsg-dsp/sso-bridge-dtos";
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
export class OauthUser extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  username!: string;

  @Column({ type: String })
  password!: string;

  @Column({ type: String })
  email!: string;

  @Column({ type: Boolean, default: false })
  require2FA!: boolean;

  @ManyToMany(() => OauthRole, { eager: true })
  @JoinTable()
  @Transform(
    ({ value }) => {
      return value?.map((role: OauthRole) => role.name) || [];
    },
    { toPlainOnly: true }
  )
  roles!: OauthRole[];

  get roleNames(): string[] {
    return this.roles?.map((role) => role.name) || [];
  }

  @Column("simple-array")
  grants!: GrantType[];
}
