import { MetaEntity } from "@tsg-dsp/common-api";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { OauthUser } from "./user.dao.js";

@Entity()
export class TotpCredential extends MetaEntity {
  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: String })
  userId!: string;

  @Column({ type: String })
  secret!: string;

  @Column({ type: String, nullable: true })
  deviceName?: string | null;

  @Column({ type: Boolean, default: false })
  isVerified!: boolean;

  @Column({ type: Date, nullable: true })
  lastUsed?: Date | null;
}
