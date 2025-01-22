import { JWK } from "jose";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation
} from "typeorm";
import { VerifiableCredential } from "@tsg-dsp/common-dsp";
import { MetaEntity } from "./common.dao.js";

@Entity({ name: "key_materials" })
export class KeyMaterialDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  type!: "EdDSA" | "ES384" | "X509";

  @Column({ type: Boolean })
  default!: boolean;

  @Column("simple-json")
  privateKey!: JWK;

  @Column("simple-json")
  publicKey!: JWK;

  @Column({ type: String, nullable: true })
  caChain?: string;
}

@Entity({ name: "credentials" })
export class CredentialDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  targetDid!: string;

  @Column("simple-json")
  credential!: VerifiableCredential;

  @Column({ type: Boolean })
  selfIssued!: boolean;

  @Column({ type: Boolean, default: false })
  revoked!: boolean;

  @Column({ type: Number, nullable: true })
  statusListIndex?: number;

  @ManyToOne(() => StatusListCredentialDao, { nullable: true, eager: true })
  @JoinColumn()
  statusListCredential?: Relation<StatusListCredentialDao>;
}

@Entity()
export class StatusListCredentialDao extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: "simple-json" })
  revoked!: Array<number>;

  @Column({ type: Boolean })
  full!: boolean;

  @OneToOne(() => CredentialDao)
  @JoinColumn()
  credential!: CredentialDao;
}
