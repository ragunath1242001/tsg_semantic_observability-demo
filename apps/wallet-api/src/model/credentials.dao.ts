import { JWK } from "jose";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common-dsp";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class KeyMaterials extends MetaEntity {
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

@Entity()
export class Credentials extends MetaEntity {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  targetDid!: string;

  @Column("simple-json")
  credential!: VerifiableCredential;

  @Column({ type: Boolean })
  selfIssued!: boolean;
}
