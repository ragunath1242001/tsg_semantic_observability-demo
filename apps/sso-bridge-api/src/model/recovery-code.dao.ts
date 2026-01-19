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
export class RecoveryCode extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OauthUser, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: OauthUser;

  @Column({ type: Number })
  userId!: number;

  @Column({ type: String })
  codeHash!: string;

  @Column({ type: Boolean, default: false })
  used!: boolean;

  @Column({ type: Date, nullable: true })
  usedAt?: Date | null;
}
