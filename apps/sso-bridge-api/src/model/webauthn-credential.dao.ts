import { MetaEntity } from "@tsg-dsp/common-api";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { OauthUser } from "./user.dao.js";

@Entity()
export class WebAuthnCredential extends MetaEntity {
  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: String })
  userId!: string;

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
