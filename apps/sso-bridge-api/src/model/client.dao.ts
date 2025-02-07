import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { GrantType } from "@tsg-dsp/sso-bridge-dtos";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class OauthClient extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  clientId!: string;

  @Column({ type: String })
  clientSecret!: string;

  @Column("simple-array")
  roles!: string[];

  @Column("simple-array")
  grants!: GrantType[];

  @Column({ type: String })
  name!: string;

  @Column({ type: String })
  description!: string;
}
