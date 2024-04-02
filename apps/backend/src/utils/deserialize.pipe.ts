import { HttpStatus, Injectable, Logger, PipeTransform } from "@nestjs/common";
import { deserialize } from "../model/serialize";
import { ClassValidationError, SerializableClass } from "../model/dsp/common";
import { ContextDto } from "@tsg-dsp/common";
import { DSPError } from "./errors/error";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type Constructor<T> = new (...args: any[]) => T;

@Injectable()
export class DeserializePipe<
  InType extends ContextDto,
  OutType extends SerializableClass<InType>
> implements PipeTransform<InType, Promise<OutType>>
{
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly type?: Constructor<OutType>) {}
  async transform(value: InType): Promise<OutType> {
    try {
      const transformed = await deserialize<OutType>(value);
      if (this.type === undefined || transformed instanceof this.type) {
        return transformed;
      } else {
        throw new DSPError(
          `Incorrect deserialization of ${this.type.name}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        ).andLog(this.logger, "warn");
      }
    } catch (err) {
      if (err instanceof ClassValidationError) {
        const errorMessages: Record<string, string> = {};
        err.errors.forEach((error) => {
          errorMessages[error.property] = `${error}`;
        });
        throw new DSPError(
          {
            message: `Validating ${
              err.errors[0].target
                ? err.errors[0].target.constructor.name
                : "an object"
            } has failed`,
            errors: err.errors
              .map((v) => v.toString(false, true, "", true))
              .join("")
              .split("\n")
              .map((l) => l.slice(12, -1))
              .filter((l) => l !== ""),
          },
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "warn");
      } else {
        throw new DSPError(`${err}`, HttpStatus.BAD_REQUEST, err).andLog(
          this.logger,
          "warn"
        );
      }
    }
  }
}
