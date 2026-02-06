import { MetaEntity, OwnableEntity } from "@tsg-dsp/common-api";
import { Credential, DataIntegrityProof, OrArray } from "@tsg-dsp/common-dsp";
import { Resource } from "@tsg-dsp/common-dtos";
import { JWK } from "jose";
import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Relation
} from "typeorm";

@Entity({ name: "key_materials" })
export class KeyMaterialDao extends MetaEntity {
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
export class CredentialDao extends OwnableEntity {
  readonly resourceType = Resource.W_CREDENTIAL;

  @Column({ type: String })
  targetDid!: string;

  @Column("simple-json")
  credential!: Credential;

  @Column("simple-json", { nullable: true })
  proof?: OrArray<DataIntegrityProof>;

  @Column({ type: String, nullable: true })
  jwt?: string;

  @Column({ type: Boolean })
  selfIssued!: boolean;

  @Column({ type: Boolean, default: false })
  revoked!: boolean;

  @Column({ type: Number, nullable: true })
  statusListIndex?: number;

  @ManyToOne(() => StatusListCredentialDao, { nullable: true, eager: true })
  @JoinColumn()
  statusListCredential?: Relation<StatusListCredentialDao>;

  @AfterLoad()
  syncOwnerIdentifier() {
    if (!this.ownerIdentifier) {
      this.ownerIdentifier = this.targetDid;
    }
  }
}

@Entity()
export class StatusListCredentialDao extends MetaEntity {
  @Column({ type: "simple-json" })
  revoked!: Array<number>;

  @Column({ type: Boolean })
  full!: boolean;

  @OneToOne(() => CredentialDao)
  @JoinColumn()
  credential!: CredentialDao;
}
