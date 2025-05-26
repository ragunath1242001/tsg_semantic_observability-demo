import {
  DataAddressDto,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";

import { AnalysisDao } from "../analyses/dao/analysis.dao.js";

@Entity()
export class TransferDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @Column({ type: String })
  role!: "provider" | "consumer";

  @Column({ type: String })
  processId!: string;

  @Column({ type: String })
  remoteParty!: string;

  @Column({ type: String })
  datasetId!: string;

  @Column({ type: String, nullable: true })
  secret?: string;

  @Column({ type: "simple-enum", enum: TransferState })
  state!: TransferState;

  @Column("simple-json")
  request!: TransferRequestMessageDto;

  @Column("simple-json")
  response!: DataPlaneRequestResponseDto;

  @Column("simple-json", { nullable: true })
  dataAddress?: DataAddressDto;

  @CreateDateColumn({ type: String })
  createdDate!: Date;

  @UpdateDateColumn({ type: String })
  modifiedDate!: Date;

  @DeleteDateColumn({ type: String })
  deletedDate!: Date;

  @ManyToOne("AnalysisDao", "transfers")
  @JoinColumn()
  analysis!: AnalysisDao;
}
