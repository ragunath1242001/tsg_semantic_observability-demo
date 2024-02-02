import { Exclude } from "class-transformer"
import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn } from "typeorm"
import { IResource } from "./dsp/catalog/catalog";
import { IReference, SerializableClass } from "./dsp/common";
import { ContextDto } from "@tsg-dsp/common";


export class MetaEntity {
  @CreateDateColumn()
  createdDate!: Date

  @UpdateDateColumn()
  modifiedDate!: Date

  @DeleteDateColumn()
  @Exclude()
  deletedDate!: Date
}

export class AutoIdEntity extends MetaEntity {
  @PrimaryGeneratedColumn()
  _id!: number;
}


export type Type<T, ParamT> = {
  // new (): T;
  new (parm: ParamT): T
}

export function mapToInstances<InType extends IReference, DtoType extends ContextDto, OutType extends SerializableClass<DtoType>>(input: Array<InType> | undefined, target: Type<OutType, InType>): Array<OutType> | undefined {
  return (input) ? input.map(element => new target(element)) : undefined;
}
