import { Exclude } from "class-transformer";
import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";

export class MetaEntity {
  @CreateDateColumn({ type: Date })
  createdDate!: Date;

  @UpdateDateColumn({ type: Date })
  modifiedDate!: Date;

  @DeleteDateColumn({ type: Date })
  @Exclude()
  deletedDate!: Date;
}
