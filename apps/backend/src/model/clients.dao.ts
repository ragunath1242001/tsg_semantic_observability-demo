import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";
import { AppRole } from "@libs/dtos";

@Entity()
export class Clients extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  clientId!: string;

  @Column()
  clientSecret!: string;

  @Column()
  didId!: string;

  @Column("simple-array")
  roles!: AppRole[];

  @Column({ nullable: true })
  refreshToken?: string;

  @Column()
  email!: string;

  @Column()
  verified!: boolean;

  @Column({ nullable: true })
  verificationCode?: string;

  @Column({ nullable: true })
  verificationExpiration?: Date;
}
