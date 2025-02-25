import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { validateOrRejectSync } from "@tsg-dsp/common-api";
import { Exclude, Expose, plainToInstance, Type } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsIn,
  ValidateNested
} from "class-validator";

export enum DataType {
  STRING = "STRING",
  URI = "URI",
  NUMBER = "NUMBER",
  DATE = "DATE",
  DATETIME = "DATETIME",
  DIF_INPUT_DESCRIPTOR = "DIF_INPUT_DESCRIPTOR"
}

export enum EvaluationTrigger {
  PROVIDER_ON_REQUEST = "PROVIDER_ON_REQUEST",
  CONSUMER_ON_REQUEST = "CONSUMER_ON_REQUEST",
  PROVIDER_CONTINUOUS = "PROVIDER_CONTINUOUS",
  CONSUMER_CONTINUOUS = "CONSUMER_CONTINUOUS",
  PROVIDER_ON_EXECUTION = "PROVIDER_ON_EXECUTION",
  CONSUMER_ON_EXECUTION = "CONSUMER_ON_EXECUTION"
}

export enum ConstraintType {
  ATOMIC = "ATOMIC",
  LOGICAL = "LOGICAL"
}

@Exclude()
export abstract class ConstraintModel {
  @IsNumber()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional()
  id?: number;

  @IsEnum(ConstraintType)
  @Expose()
  @ApiProperty({
    enum: ConstraintType,
    enumName: "ConstraintType",
    example: "ATOMIC"
  })
  type!: ConstraintType;

  @IsString()
  @Expose()
  @ApiProperty({ example: "Constraint title" })
  title!: string;

  @IsString()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional({ example: "Constraint description" })
  description?: string;

  static parse(plain: unknown[]): ConstraintModel[];
  static parse(plain: unknown): ConstraintModel;
  static parse(
    plain: unknown | unknown[]
  ): ConstraintModel | ConstraintModel[] {
    if (Array.isArray(plain)) {
      const container = validateOrRejectSync(
        plainToInstance(ConstraintContainer, {
          constraints: plain
        })
      );
      return container.constraints;
    } else {
      const container = validateOrRejectSync(
        plainToInstance(ConstraintContainer, {
          constraints: [plain]
        })
      );
      return container.constraints[0];
    }
  }
}

@Exclude()
export class AtomicConstraint extends ConstraintModel {
  @IsString()
  @Expose()
  @ApiProperty({ example: "spatial" })
  leftOperand!: string;

  @IsString()
  @Expose()
  @ApiProperty({ example: "eq" })
  operator!: string;

  @IsString()
  @Expose()
  @ApiProperty({ example: "http://example.com/context" })
  contextPath!: string;

  @IsEnum(EvaluationTrigger, { each: true })
  @Expose()
  @ApiProperty({
    enum: EvaluationTrigger,
    enumName: "EvaluationScope",
    example: ["PROVIDER_ON_REQUEST"]
  })
  evaluable!: EvaluationTrigger[];

  @IsEnum(DataType)
  @IsOptional()
  @Expose()
  @ApiPropertyOptional({
    enum: DataType,
    enumName: "DataType",
    example: "STRING"
  })
  dataType?: DataType;

  @IsString()
  @Expose({ groups: ["instance"] })
  @IsOptional()
  @ApiPropertyOptional({ example: "value" })
  value?: string;

  static parse(plain: unknown[]): AtomicConstraint[];
  static parse(plain: unknown): AtomicConstraint;
  static parse(
    plain: unknown | unknown[]
  ): AtomicConstraint | AtomicConstraint[] {
    return validateOrRejectSync(
      plainToInstance(AtomicConstraint, plain, { groups: ["instance"] })
    );
  }
}

@Exclude()
export class LogicalConstraint extends ConstraintModel {
  @IsString()
  @IsIn(["and", "or"])
  @Expose()
  @ApiProperty({ example: "and" })
  logicalOperator!: "and" | "or";
  @Type(() => ConstraintModel, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: AtomicConstraint, name: ConstraintType.ATOMIC },
        { value: LogicalConstraint, name: ConstraintType.LOGICAL }
      ]
    },
    keepDiscriminatorProperty: true
  })
  @Expose()
  @ApiProperty({ type: () => [ConstraintModel] })
  @ValidateNested()
  constraints!: Array<ConstraintModel>;
}

@Exclude()
export class ConstraintContainer {
  @Type(() => ConstraintModel, {
    discriminator: {
      property: "type",

      subTypes: [
        { value: AtomicConstraint, name: ConstraintType.ATOMIC },
        { value: LogicalConstraint, name: ConstraintType.LOGICAL }
      ]
    },
    keepDiscriminatorProperty: true
  })
  @ValidateNested()
  @Expose()
  constraints!: Array<ConstraintModel>;
}
