import { GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

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

  @Column("simple-array")
  roles!: string[];

  @Column("simple-array")
  grants!: GrantType[];
}
