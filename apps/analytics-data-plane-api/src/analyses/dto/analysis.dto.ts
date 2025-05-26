import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransferDto } from "@tsg-dsp/common-dtos";

import { AlgorithmEventDto } from "../../events/dto/algorithm-event.dto.js";
import { InternalEventDto } from "../../events/dto/internal-event.dto.js";

export class AnalysisDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  status!: string;
  @ApiProperty({ type: [String] })
  participantIds!: Array<string>;
  @ApiProperty({ type: Date })
  startedAt!: Date;
  @ApiPropertyOptional({ type: Date })
  finishedAt?: Date;
  @ApiPropertyOptional({ type: [TransferDto] })
  transfers?: Array<TransferDto>;
  @ApiPropertyOptional({ type: [AlgorithmEventDto] })
  algorithmEvents?: Array<AlgorithmEventDto>;
  @ApiPropertyOptional({ type: [InternalEventDto] })
  internalEvents?: Array<InternalEventDto>;
}
