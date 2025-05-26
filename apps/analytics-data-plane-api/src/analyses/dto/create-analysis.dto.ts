import { ApiProperty } from "@nestjs/swagger";

export class CreateAnalysisDto {
  @ApiProperty({ example: "Analysis Name" })
  name!: string;

  @ApiProperty({
    type: [String],
    example: ["did:web:participant1", "did:web:participant2"]
  })
  participantIds!: string[];
}
