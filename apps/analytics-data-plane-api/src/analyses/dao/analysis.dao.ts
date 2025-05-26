import {
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryColumn
} from "typeorm";

import { TransferDao } from "../../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../../events/dao/algorithm-event.dao.js";
import { InternalEventDao } from "../../events/dao/internal-event.dao.js";

@Entity()
export class AnalysisDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  name!: string;

  @Column({ type: String })
  status!: string;

  @Column({ type: Date })
  startedAt!: Date;

  @Column({ type: Date, nullable: true })
  finishedAt?: Date;

  @Column("simple-array")
  participantIds!: string[];

  @OneToMany("TransferDao", "analysis")
  @JoinTable()
  transfers!: TransferDao[];

  @OneToMany("AlgorithmEventDao", "analysis")
  @JoinTable()
  algorithmEvents!: AlgorithmEventDao[];

  @ManyToOne("InternalEventDao", "analysis")
  @JoinTable()
  internalEvents!: InternalEventDao[];
}
