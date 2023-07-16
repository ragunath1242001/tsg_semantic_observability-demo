import { Injectable, PipeTransform } from "@nestjs/common";
import { deserialize } from "../../model/serialize";

@Injectable()
export class DeserializePipe<InType, OutType> implements PipeTransform<InType, Promise<OutType>> {
  async transform(value: InType): Promise<OutType> {
    return await deserialize(value);
  }
}