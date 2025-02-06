import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class TokenDao extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  accessToken!: string;

  @Column({ type: String })
  accessTokenExpiresAt!: string;

  @Column({ type: String })
  refreshToken!: string;

  @Column({ type: String })
  refreshTokenExpiresAt!: string;

  @Column({ type: String })
  scope!: string;

  @Column({ type: String, nullable: true })
  client!: string;

  @Column({ type: String, nullable: true })
  user?: string;
}
