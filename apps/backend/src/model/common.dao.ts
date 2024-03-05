import { Exclude } from "class-transformer"
import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm"

export class MetaEntity {
  @CreateDateColumn()
  created!: Date

  @UpdateDateColumn()
  modified!: Date

  @DeleteDateColumn()
  @Exclude()
  deleted!: Date
}