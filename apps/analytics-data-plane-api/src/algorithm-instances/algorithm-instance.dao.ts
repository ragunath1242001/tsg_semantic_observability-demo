import {
  AlgorithmDefinitionDto,
  AlgorithmParticipant,
  type OrchestrationStatus
} from "@tsg-dsp/analytics-data-plane-dtos";
import { OwnableEntity } from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany
} from "typeorm";

import { TransferDao } from "../dataplane/transfer.dao.js";
import { AlgorithmEventDao } from "../events/algorithm-event.dao.js";
import { InternalEventDao } from "../events/internal-event.dao.js";
import { ProjectAgreementDao } from "../project-agreements/project-agreement.dao.js";

@Entity()
export class AlgorithmInstanceDao extends OwnableEntity {
  readonly resourceType = Resource.ADP_ALGORITHM;

  @Column("simple-json")
  algorithmDefinition!: AlgorithmDefinitionDto;

  @Column("simple-json")
  participants!: AlgorithmParticipant[];

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
  algorithmEvents?: AlgorithmEventDao[];

  @OneToMany(
    () => InternalEventDao,
    (internalEvent) => internalEvent.algorithmInstance
  )
  @JoinTable()
  internalEvents?: InternalEventDao[];

  @ManyToOne(() => ProjectAgreementDao, { nullable: true, eager: true })
  @JoinColumn()
  projectAgreement?: ProjectAgreementDao;

  @Column({ type: String, nullable: true })
  orchestrationStatus?: OrchestrationStatus;

  @Column({ type: Boolean, nullable: true })
  isInitiator?: boolean;

  @Column("simple-json", { nullable: true })
  participantStatuses?: Record<string, "completed" | "failed" | "terminated">;
}
