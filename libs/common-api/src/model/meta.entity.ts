import { Exclude } from "class-transformer";
import {
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";
import { v7 } from "uuid";

export class BaseEntity {
  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  modifiedDate!: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedDate!: Date;
}

export class MetaEntity extends BaseEntity {
  @PrimaryColumn()
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = v7();
    }
  }
}
