import { DIDDocument } from "did-resolver";
import { JWK, KeyLike, exportJWK, importJWK } from "jose";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from "typeorm";
import { VerifiableCredential, CredentialSubject } from "./credential.dto.js";
import { ClassConstructor, Exclude, instanceToPlain, plainToClass } from "class-transformer";

export class KeyTransformer implements ValueTransformer {
  async to(key: KeyLike): Promise<JWK> {
    const jwk = await exportJWK(key);
    return jwk;
  }
  async from(value: JWK): Promise<KeyLike> {
    return (await importJWK(value)) as KeyLike;
  }
}

export class ClassTransformer<C> implements ValueTransformer {
  constructor(private readonly c: ClassConstructor<C>) {}

  to(value: C): string {
    return JSON.stringify(instanceToPlain(value))
  }
  from(value: string): C {
    return plainToClass(this.c, JSON.parse(value));
  }
}

export class MetaEntity {
  @CreateDateColumn()
  created!: Date

  @UpdateDateColumn()
  modified!: Date

  @DeleteDateColumn()
  @Exclude()
  deleted!: Date
}


@Entity()
export class DIDDocuments extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("simple-json")
  document!: DIDDocument
}

@Entity()
export class KeyMaterials extends MetaEntity {
  @PrimaryColumn()
  id!: string

  @Column()
  type!: 'EdDSA' | 'ES384' | 'X509'

  @Column()
  default!: boolean

  @Column("simple-json")
  privateKey!: JWK

  @Column("simple-json")
  publicKey!: JWK
}

@Entity()
export class Credentials extends MetaEntity {
  @PrimaryColumn()
  id!: string;

  @Column("simple-json")
  credential!: VerifiableCredential<CredentialSubject>
}