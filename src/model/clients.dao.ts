import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MetaEntity } from "./common.dao.js";

@Entity()
export class Clients extends MetaEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  clientId!: string

  @Column()
  clientSecret!: string

  @Column()
  type!: 'admin' | 'user'

  @Column()
  didId!: string
}