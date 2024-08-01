import { ContextDto, IReference, SerializableClass } from "@tsg-dsp/common-dsp";
import { Exclude } from "class-transformer";
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from "typeorm";

export class MetaEntity {
  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  modifiedDate!: Date;

  @DeleteDateColumn()
  @Exclude()
  deletedDate!: Date;
}

export class AutoIdEntity extends MetaEntity {
  @PrimaryGeneratedColumn()
  _id!: number;
}

export type Type<T, ParamT> = {
  // new (): T;
  new (parm: ParamT): T;
};

export function mapToInstances<
  InType extends IReference,
  DtoType extends ContextDto,
  OutType extends SerializableClass<DtoType>
>(
  input: Array<InType> | undefined,
  target: Type<OutType, InType>
): Array<OutType> | undefined {
  return input ? input.map((element) => new target(element)) : undefined;
}

export function instanceTransformer<
  OutType extends SerializableClass<ContextDto>
>(target: Type<OutType, any>): ValueTransformer {
  return {
    to: (v) => v,
    from: (v) => (v ? new target(v) : undefined),
  };
}
