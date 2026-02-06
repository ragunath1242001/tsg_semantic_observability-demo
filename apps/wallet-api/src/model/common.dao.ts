import { Exclude } from "class-transformer";
import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from "typeorm";

export { MetaEntity, OwnableEntity } from "@tsg-dsp/common-api";

export class TimestampEntity {
  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  modifiedDate!: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedDate!: Date;
}
