import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, Relation } from "typeorm";
import { MetaEntity, MetaEntityWithoutPrimary } from "../../common.dao";
import { DataPlaneTransferDto } from "../../data-planes/dataPlanes.dto";
import { Multilanguage } from "../common";
import { TransferProcess, DataAddress } from "./messages";
import { TransferState } from "./messages.dto";
import { ITransferEvent, ITransferStatus, TransferEvent, TransferStatus } from "./transfer.dto";

export type TransferRole = "provider" | "consumer";

@Entity()
export class TransferEventDao extends MetaEntity implements ITransferEvent {
  @Column()
  time!: Date
  @Column("simple-enum")
  state!: TransferState
  @Column({nullable: true})
  localMessage?: string
  @Column({nullable: true})
  code?: string
  @Column("simple-json", {nullable: true})
  reason?: Multilanguage[]
  @Column()
  type!: "local" | "remote"
  @ManyToOne(() => TransferDetailDao)
  _status?: Relation<TransferDetailDao>
}

@Entity()
export class TransferDetailDao extends MetaEntityWithoutPrimary implements ITransferStatus {
  @PrimaryColumn()
  localId!: string
  @Column()
  remoteId!: string
  @Column()
  role!: TransferRole
  @Column()
  remoteAddress!: string
  @Column()
  remoteParty!: string
  @Column()
  state!: TransferState
  @Column("simple-json")
  process!: TransferProcess
  @Column()
  agreementId!: string
  @Column({nullable: true})
  format?: string
  @Column("simple-json", {nullable: true})
  dataAddress?: DataAddress
  @Column("simple-json")
  dataPlaneTransfer!: DataPlaneTransferDto
  @OneToMany(() => TransferEventDao, (event) => event._status, {cascade: true, eager: true})
  events!: TransferEvent[]
}