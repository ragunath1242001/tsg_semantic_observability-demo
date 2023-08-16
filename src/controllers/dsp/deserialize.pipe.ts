import { Injectable, PipeTransform } from "@nestjs/common";
import { deserialize } from "../../model/serialize";
import { SerializableClass } from "../../model/dsp/common";
import { ContextDto } from "../../model/dsp/common.dto";

// tslint:disable-next-line: no-any
type Constructor<T> = new (...args: any[]) => T;

@Injectable()
export class DeserializePipe<InType extends ContextDto, OutType extends SerializableClass<InType>> implements PipeTransform<InType, Promise<OutType>> {
  constructor(private readonly type?: Constructor<OutType>) {}
  async transform(value: InType): Promise<OutType> {
    const transformed = await deserialize<OutType>(value);
    if (this.type === undefined || transformed instanceof this.type) {
      return transformed;
    } else {
      throw Error(`Incorrect deserialization of ${this.type.name}`);
    }
  }
}