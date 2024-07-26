import { JWK } from "jose";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { VerifiableCredential, CredentialSubject } from "@tsg-dsp/common-dsp";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class KeyMaterials extends MetaEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: "EdDSA" | "ES384" | "X509";

  @Column()
  default!: boolean;

  @Column("simple-json")
  privateKey!: JWK;

  @Column("simple-json")
  publicKey!: JWK;

  @Column({ nullable: true })
  caChain?: string;
}

@Entity()
export class Credentials extends MetaEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  targetDid!: string;

  @Column("simple-json")
  credential!: VerifiableCredential<CredentialSubject>;

  @Column("boolean")
  selfIssued!: boolean;
}
