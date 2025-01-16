import { ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Type } from "class-transformer";
import { IsInt, Min, IsOptional, Max, IsEnum, IsString } from "class-validator";

export enum Order {
  ASC = "ASC",
  DESC = "DESC"
}

export class PaginationOptionsDto {
  static readonly NO_PAGINATION: PaginationOptionsDto = {
    order: Order.DESC,
    order_by: "modifiedDate",
    page: 1,
    per_page: Number.MAX_SAFE_INTEGER,
    skip: 0,
    take: Number.MAX_SAFE_INTEGER
  };

  @ApiPropertyOptional({ enum: Order, default: Order.DESC })
  @IsEnum(Order)
  @IsOptional()
  readonly order: Order = Order.DESC;

  @ApiPropertyOptional({ default: "modifiedDate" })
  @IsOptional()
  @IsString()
  readonly order_by: string = "modifiedDate";

  @ApiPropertyOptional({
    minimum: 1,
    default: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 100
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  readonly per_page: number = 100;

  @Exclude()
  get skip() {
    return (this.page - 1) * this.per_page;
  }

  @Exclude()
  get take() {
    return this.per_page;
  }
}
