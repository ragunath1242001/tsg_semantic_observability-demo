import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

export abstract class DataRequirementsBase {
  @ApiProperty({ description: "Type of the data (e.g., csv)" })
  @IsString()
  @IsDefined()
  public type!: "csv";
}

export class DataRequirementColumn {
  @ApiProperty({ description: "Name of the column" })
  @IsString()
  @IsDefined()
  public name!: string;

  @ApiProperty({
    description: "Type of the column (e.g., xs:integer, xs:string)"
  })
  @IsString()
  @IsDefined()
  public type!: string;
}

export class CsvDataRequirements extends DataRequirementsBase {
  @ApiProperty({ description: "Type of the data", pattern: "^csv$" })
  @IsString()
  @IsDefined()
  public type = "csv" as const;

  @ApiProperty({ description: "List of required columns" })
  @ValidateNested({ each: true })
  @Type(() => DataRequirementColumn)
  @ArrayNotEmpty()
  public columns!: DataRequirementColumn[];
}

export type DataRequirements = CsvDataRequirements;

export class AlgorithmEvents {
  @ApiProperty({ description: "Name of the event" })
  @IsString()
  @IsDefined()
  public name!: string;

  @ApiProperty({ description: "Description of the event" })
  @IsString()
  @IsDefined()
  public description!: string;

  @ApiProperty({ description: "Type of the event (e.g., json, blob)" })
  @IsString()
  @IsDefined()
  public type!: string;
}

export class RoleState {
  @ApiProperty({ description: "Name of the state" })
  @IsString()
  @IsDefined()
  public name!: string;
}

export class RoleCardinality {
  @ApiProperty({ description: "Minimum number of participants" })
  @IsNumber()
  @IsDefined()
  public min!: number;
  @ApiProperty({ description: "Maximum number of participants" })
  @IsNumber()
  @IsOptional()
  public max?: number;
}

export class RoleDefinition {
  @ApiProperty({ description: "Name of the role (e.g., server, node)" })
  @IsString()
  @IsDefined()
  public name!: string;

  @ApiProperty({ description: "List of states for the role" })
  @ValidateNested({ each: true })
  @Type(() => RoleState)
  @ArrayNotEmpty()
  public states!: RoleState[];

  @ApiProperty({ description: "Role cardinality" })
  @ValidateNested()
  @Type(() => RoleCardinality)
  @IsDefined()
  public cardinality!: RoleCardinality;

  @ApiProperty({
    description: "List of roles participants in this role sends events to"
  })
  @IsString({ each: true })
  @IsDefined()
  public communicatesToRoles!: string[];

  @ApiProperty({
    description: "Data requirements for the participants in this role"
  })
  @ValidateNested()
  @Type(() => DataRequirementsBase, {
    discriminator: {
      property: "type",
      subTypes: [{ value: CsvDataRequirements, name: "csv" }]
    }
  })
  @IsOptional()
  public dataRequirements?: DataRequirements;
}

export class InternalEvent {
  @ApiProperty({ description: "Name of the internal event" })
  @IsString()
  @IsDefined()
  public name!: string;

  @ApiProperty({ description: "Description of the internal event" })
  @IsString()
  @IsDefined()
  public description!: string;

  @ApiProperty({
    description: "Type of the internal event (e.g., counter, gauge)"
  })
  @IsString()
  @IsDefined()
  public type!: string;
}

export enum UIElementType {
  FIELD = "field",
  LINE_GRAPH = "line-graph",
  TABLE = "table"
}

export class UITemplate {
  @ApiProperty({ description: "Metric associated with the UI element" })
  @IsString()
  @IsDefined()
  public metric!: string;

  @ApiProperty({ description: "Description of the UI element" })
  @IsString()
  @IsDefined()
  public description!: string;

  @ApiProperty({
    description: "Type of the UI element (e.g., field, line-graph, table)",
    enum: UIElementType
  })
  @IsDefined()
  public type!: UIElementType;
}

export class AlgorithmDefinitionDto {
  @ApiProperty({ description: "Title of the algorithm" })
  @IsString()
  @IsDefined()
  public title!: string;

  @ApiProperty({ description: "Description of the algorithm" })
  @IsString()
  @IsDefined()
  public description!: string;

  @ApiProperty({ description: "Keywords associated with the algorithm" })
  @IsString({ each: true })
  @ArrayNotEmpty()
  public keywords!: string[];

  @ApiProperty({ description: "Public image URL of the algorithm" })
  @IsString()
  @IsDefined()
  public image!: string;

  @ApiProperty({ description: "Algorithm event structure of the algorithm" })
  @ValidateNested({ each: true })
  @Type(() => AlgorithmEvents)
  @ArrayNotEmpty()
  public algorithmEvents!: AlgorithmEvents[];

  @ApiProperty({ description: "Role definitions for the algorithm" })
  @ValidateNested({ each: true })
  @Type(() => RoleDefinition)
  @ArrayNotEmpty()
  public roleDefinitions!: RoleDefinition[];

  @ApiProperty({ description: "Internal event structure of the algorithm" })
  @ValidateNested({ each: true })
  @Type(() => InternalEvent)
  @ArrayNotEmpty()
  public internalEvents!: InternalEvent[];

  @ApiProperty({ description: "UI template for visualizing internal events" })
  @ValidateNested({ each: true })
  @Type(() => UITemplate)
  @ArrayNotEmpty()
  public uiTemplate!: UITemplate[];
}
