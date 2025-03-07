import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class TokenDao extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  accessToken!: string;

  @Column({ type: Date })
  accessTokenExpiresAt!: Date;

  @Column({ type: String, nullable: true })
  refreshToken?: string;

  @Column({ type: Date, nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ type: String })
  scope!: string;

  @Column({ type: String, nullable: true })
  clientId!: string;

  @Column({ type: Number, nullable: true })
  userId?: number;

  @Column({ type: Boolean })
  revoked!: boolean;
}
