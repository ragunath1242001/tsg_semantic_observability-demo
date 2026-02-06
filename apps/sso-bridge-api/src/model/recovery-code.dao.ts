import { MetaEntity } from "@tsg-dsp/common-api";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { OauthUser } from "./user.dao.js";

@Entity()
export class RecoveryCode extends MetaEntity {
  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: String })
  userId!: string;

  @Column({ type: String })
  codeHash!: string;

  @Column({ type: Boolean, default: false })
  used!: boolean;

  @Column({ type: Date, nullable: true })
  usedAt?: Date | null;
}
