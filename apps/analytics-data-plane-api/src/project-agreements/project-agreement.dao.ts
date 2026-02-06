import { ProjectAgreementDto } from "@tsg-dsp/analytics-data-plane-dtos";
import { OwnableEntity } from "@tsg-dsp/common-api";
import { Resource } from "@tsg-dsp/common-dtos";
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { DatasetDao } from "../dataplane/dataset.dao.js";

@Entity()
export class ProjectAgreementDao extends OwnableEntity {
  readonly resourceType = Resource.ADP_PROJECT_AGREEMENT;

  @Column({ type: String, unique: true })
  projectId!: string;

  @Column("simple-json")
  projectAgreement!: ProjectAgreementDto;

  @Column({ type: String })
  initiator!: string;

  @Column({ type: String })
  status!:
    | "WAITING_FOR_SIGNATURES"
    | "SIGNATURE_REQUESTED"
    | "SIGNED"
    | "FINALIZED";

  @Column("simple-json")
  signatures!: Record<string, string>;

  @Column({ type: String, nullable: true })
  hash?: string;

  @OneToMany(
    () => ProjectAgreementCallbackDao,
    (callback) => callback.projectAgreement,
    {
      eager: true,
      cascade: true
    }
  )
  callbacks!: ProjectAgreementCallbackDao[];

  @ManyToMany(() => DatasetDao, { eager: true })
  @JoinTable()
  datasets!: DatasetDao[];
}

@Entity()
export class ProjectAgreementCallbackDao {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: String })
  participantId!: string;

  @Column({ type: String })
  url!: string;

  @Column({ type: String })
  authToken!: string;

  @Column({ type: String, nullable: true })
  transferId?: string;

  @ManyToOne(
    () => ProjectAgreementDao,
    (projectAgreement) => projectAgreement.callbacks
  )
  projectAgreement!: ProjectAgreementDao;
}
