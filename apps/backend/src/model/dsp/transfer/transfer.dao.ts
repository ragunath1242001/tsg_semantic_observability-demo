import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from "typeorm";
import { AutoIdEntity, MetaEntity } from "../../common.dao";
import { DataPlaneTransferDto } from "@libs/dtos";
import { Multilanguage } from "../common";
import { TransferProcess, DataAddress } from "./messages";
import { TransferState } from "@tsg-dsp/common";
import { ITransferEvent, ITransferStatus, TransferEvent } from "./transfer";

export type TransferRole = "provider" | "consumer";

@Entity()
export class TransferEventDao extends AutoIdEntity implements ITransferEvent {
  @Column()
  time!: Date;
  @Column()
  state!: TransferState;
  @Column({ nullable: true })
  localMessage?: string;
  @Column({ nullable: true })
  code?: string;
  @Column("simple-json", { nullable: true })
  reason?: Multilanguage[];
  @Column()
  type!: "local" | "remote";
  @ManyToOne(() => TransferDetailDao)
  _status?: Relation<TransferDetailDao>;
}

@Entity()
export class TransferDetailDao extends MetaEntity implements ITransferStatus {
  @PrimaryColumn()
  localId!: string;
  @Column({ nullable: true })
  remoteId?: string;
  @Column()
  role!: TransferRole;
  @Column()
  remoteAddress!: string;
  @Column()
  remoteParty!: string;
  @Column()
  state!: TransferState;
  @Column("simple-json")
  process!: TransferProcess;
  @Column()
  agreementId!: string;
  @Column({ nullable: true })
  format?: string;
  @Column("simple-json", { nullable: true })
  dataAddress?: DataAddress;
  @Column("simple-json")
  dataPlaneTransfer!: DataPlaneTransferDto;
  @OneToMany(() => TransferEventDao, (event) => event._status, {
    cascade: true,
    eager: true,
  })
  events!: TransferEvent[];
}
