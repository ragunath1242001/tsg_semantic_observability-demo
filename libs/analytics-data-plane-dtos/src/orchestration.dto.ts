import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class OrchestrationStatusDto {
  @ApiProperty({
    description: "The status of the orchestration",
    example: "accepted",
    enum: ["accepted", "pending"]
  })
  @IsString()
  @IsEnum(["accepted", "pending"])
  status!: "accepted" | "pending";

  @ApiPropertyOptional({
    description: "The reason for the pending status, if applicable",
    example: "Waiting for participant data"
  })
  @IsOptional()
  @IsString()
  pendingReason?: string;

  @ApiPropertyOptional({
    description: "The interval in seconds for the orchestration",
    example: 60
  })
  @IsOptional()
  @IsNumber()
  interval?: number;
}
