import { Exclude, Expose, plainToInstance, Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AtomicConstraint,
  ConstraintModel,
  ConstraintType,
  LogicalConstraint
} from "./constraint.dto.js";
import { validateOrRejectSync } from "@tsg-dsp/common-api";

export enum RuleType {
  PERMISSION = "PERMISSION",
  PROHIBITION = "PROHIBITION",
  DUTY = "DUTY"
}

@Exclude()
export class Rule {
  @IsNumber()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional()
  id?: number;

  @IsString({ each: true })
  @Expose()
  @ApiProperty({ type: [String] })
  action!: string[];

  @IsString({ each: true })
  @IsOptional()
  @Expose()
  @ApiPropertyOptional({ type: [String] })
  assignee?: string[];

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
  @Type(() => Rule)
  @Expose()
  @ApiProperty({ type: () => [Rule] })
  @ValidateNested()
  duties!: Array<Rule>;

  @IsEnum(RuleType)
  @IsOptional()
  @ApiPropertyOptional({ enum: RuleType, enumName: "RuleType" })
  type?: RuleType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  target?: string;

  static parse(plain: unknown[]): Rule[];
  static parse(plain: unknown): Rule;
  static parse(plain: unknown | unknown[]): Rule | Rule[] {
    return validateOrRejectSync(plainToInstance(Rule, plain));
  }
}
