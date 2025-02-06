import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { GrantType } from "@tsg-dsp/oauth-server-dtos";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class OauthUser extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  username!: string;

  @Column({ type: String })
  password!: string;

  @Column("simple-array")
  roles!: string[];

  @Column("simple-array")
  grants!: GrantType[];
}
