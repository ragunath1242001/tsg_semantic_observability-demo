import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MetaEntity } from "./common.dao.js";
import { CredentialSubject } from "@tsg-dsp/common";

@Entity()
export class CredentialIssuance extends MetaEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ unique: true })
  preAuthorizedCode!: string;

  @OneToMany(() => CIAccessToken, (token) => token.issuance)
  tokens!: CIAccessToken[];

  @Column()
  holderId!: string;

  @Column()
  credentialType!: string;

  @Column({ nullable: true })
  credentialId?: string;

  @Column()
  revoked!: boolean;

  @Column("simple-json")
  credentialSubject!: CredentialSubject;
}

@Entity()
export class CIAccessToken extends MetaEntity {
  @PrimaryColumn()
  access_token!: string;

  @Column()
  expires_at!: Date;

  @Column()
  refresh_token!: string;

  @Column()
  nonce!: string;

  @ManyToOne(() => CredentialIssuance, (issuance) => issuance.tokens, {
    eager: true,
  })
  issuance!: CredentialIssuance;
}
