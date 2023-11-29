import { Exclude } from "class-transformer"
import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn } from "typeorm"
import { IResource } from "./dsp/catalog/catalog";
import { SerializableClass } from "./dsp/common";
import { ContextDto } from "./dsp/common.dto";

export class MetaEntity {
  @PrimaryGeneratedColumn()
  _id!: number;

  @CreateDateColumn()
  createdDate!: Date

  @UpdateDateColumn()
  modifiedDate!: Date

  @DeleteDateColumn()
  @Exclude()
  deletedDate!: Date
}


export type Type<T, ParamT> = {
  // new (): T;
  new (parm: ParamT): T
}

export function mapToInstances<InType extends IResource, DtoType extends ContextDto, OutType extends SerializableClass<DtoType>>(input: Array<InType> | undefined, target: Type<OutType, InType>): Array<OutType> | undefined {
  return (input) ? input.map(element => new target(element)) : undefined;
}
