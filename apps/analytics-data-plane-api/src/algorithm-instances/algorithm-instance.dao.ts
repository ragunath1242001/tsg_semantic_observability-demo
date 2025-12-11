import {
  AlgorithmDefinitionDto,
  AlgorithmParticipant
} from "@tsg-dsp/analytics-data-plane-dtos";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryColumn
} from "typeorm";

import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { ProjectAgreementDao } from "../project-agreements/project-agreement.dao.js";

@Entity()
export class AlgorithmInstanceDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column("simple-json")
  algorithmDefinition!: AlgorithmDefinitionDto;

  @Column("simple-json")
  participants!: AlgorithmParticipant[];

  @CreateDateColumn({ type: String })
  createdDate!: Date;

  @Column({ type: String })
  status!: string;

  @Column({ type: Date, nullable: true })
  startedAt?: Date;

  @Column({ type: Date, nullable: true })
  finishedAt?: Date;

  @OneToMany(() => TransferDao, (transfer) => transfer.algorithmInstance)
  @JoinTable()
  transfers!: TransferDao[];

  @OneToMany(() => AlgorithmEventDao, (event) => event.algorithmInstance)
  @JoinTable()
  algorithmEvents!: AlgorithmEventDao[];

  @ManyToOne(
    () => InternalEventDao,
    (internalEvent) => internalEvent.algorithmInstance
  )
  @JoinTable()
  internalEvents!: InternalEventDao[];

  @ManyToOne(() => ProjectAgreementDao, { nullable: true, eager: true })
  @JoinColumn()
  projectAgreement?: ProjectAgreementDao;
}
