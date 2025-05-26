import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { AnalysisDao } from "../../analyses/dao/analysis.dao.js";

@Entity()
export class InternalEventDao {
  @PrimaryColumn({ type: String })
  id!: string;

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
    type: "simple-json",
    nullable: true
  })
  data?: object | null;
}
