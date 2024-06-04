import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class SIToken extends MetaEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ nullable: true })
  accessToken?: string;

  @Column()
  audience!: string;

  @Column({ nullable: true })
  scope?: string;
}
