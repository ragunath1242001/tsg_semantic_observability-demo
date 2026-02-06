import { MetaEntity } from "@tsg-dsp/common-api";
import { Column, Entity } from "typeorm";

@Entity()
export class TokenDao extends MetaEntity {
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

  @Column({ type: String, nullable: true })
  userId?: string;

  @Column({ type: Boolean })
  revoked!: boolean;
}
