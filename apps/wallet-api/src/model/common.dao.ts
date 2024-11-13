import { Exclude } from "class-transformer";
import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

export class MetaEntity {
  @CreateDateColumn({ type: Date })
  created!: Date;

  @UpdateDateColumn({ type: Date })
  modified!: Date;

  @DeleteDateColumn({ type: Date })
  @Exclude()
  deleted!: Date;
}
