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
export class WebAuthnCredential extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: Number })
  userId!: number;

  @Column({ type: String, unique: true })
  credentialId!: string;

  @Column({ type: String })
  publicKey!: string;

  @Column({ type: Number, default: 0 })
  counter!: number;

  @Column({ type: String, nullable: true })
  deviceName?: string | null;

  @Column({ type: String, nullable: true })
  transports?: string | null; // JSON array of transports

  @Column({ type: Date })
  lastUsed!: Date;
}
