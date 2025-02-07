import { JWK } from "jose";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class KeyDao {
  @PrimaryColumn({ type: String })
  kid!: string;

  @Column({ type: "simple-json" })
  privateKey!: JWK;

  @Column({ type: "simple-json" })
  publicKey!: JWK;

  @Column({ type: Date })
  createdAt!: Date;

  @Column({ type: Date })
  expiresAt!: Date;

  @Column({ type: Boolean })
  current!: boolean;
}
