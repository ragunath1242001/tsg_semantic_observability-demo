import { CredentialSubject } from "@tsg-dsp/common-dsp";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn
} from "typeorm";

import { MetaEntity } from "./common.dao.js";

@Entity()
export class CredentialIssuance extends MetaEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: String, unique: true })
  preAuthorizedCode!: string;

  @OneToMany(() => CIAccessToken, (token) => token.issuance)
  tokens!: CIAccessToken[];

  @Column({ type: String, nullable: true })
  holderId?: string;

  @Column({ type: String })
  credentialType!: string;

  @Column({ type: String, nullable: true })
  credentialId?: string;

  @Column({ type: Boolean })
  revoked!: boolean;

  @Column({ type: "simple-json" })
  credentialSubject!: CredentialSubject;

  @Column({ type: String, nullable: true })
  remoteId?: string;
}

@Entity()
export class CIAccessToken extends MetaEntity {
  @PrimaryColumn({ type: String })
  access_token!: string;

  @Column({ type: Date })
  expires_at!: Date;

  @Column({ type: String })
  refresh_token!: string;

  @ManyToOne(() => CredentialIssuance, (issuance) => issuance.tokens, {
    eager: true
  })
  issuance!: CredentialIssuance;
}
