import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { AnalysisDao } from "../../analyses/dao/analysis.dao.js";
import { getBinaryColumnType } from "../../utils/get-binary-column-type.js";

@Entity()
export class AlgorithmEventDao {
  // Internal db id
  @PrimaryColumn({ type: String })
  id!: string;

  // External event id
  @Column({ type: String, unique: true })
  eventId!: string;

  @ManyToOne(() => AnalysisDao)
  @JoinColumn()
  analysis!: AnalysisDao;

  @Column({ type: String })
  name!: string;

  @Column({ type: Number, unique: true })
  number!: number;

  @Column({ type: Date })
  timestamp!: Date;

  @Column({
    type: getBinaryColumnType(),
    nullable: true
  })
  data!: Buffer | null;

  @Column({
    type: Boolean
  })
  isOwnEvent!: boolean;

  @Column({ type: String, nullable: true })
  transferId?: string;

  @Column({ type: String })
  createdBy!: string;
}
