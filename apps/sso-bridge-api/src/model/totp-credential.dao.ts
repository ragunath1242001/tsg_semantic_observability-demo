import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { MetaEntity } from "./common.dao.js";
import { OauthUser } from "./user.dao.js";

@Entity()
export class TotpCredential extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: Number })
  userId!: number;

  @Column({ type: String })
  secret!: string;

  @Column({ type: String, nullable: true })
  deviceName?: string | null;

  @Column({ type: Boolean, default: false })
  isVerified!: boolean;

  @Column({ type: Date, nullable: true })
  lastUsed?: Date | null;
}
