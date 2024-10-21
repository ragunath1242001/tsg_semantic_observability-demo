import { TransferRole } from "@tsg-dsp/control-plane-dtos";
import {
  DataAddress,
  DataPlaneTransferDto,
  ITransferEvent,
  ITransferStatus,
  Multilanguage,
  TransferEvent,
  TransferProcess,
  TransferState,
} from "@tsg-dsp/common-dsp";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from "typeorm";
import { AutoIdEntity, jsonLdTransformer, MetaEntity } from "./common.dao";

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
  @Column("simple-json", {
    transformer: jsonLdTransformer,
  })
  process!: TransferProcess;
  @Column()
  agreementId!: string;
  @Column({ nullable: true })
  format?: string;
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer,
  })
  dataAddress?: DataAddress;
  @Column("simple-json")
  dataPlaneTransfer!: DataPlaneTransferDto;
  @OneToMany(() => TransferEventDao, (event) => event._status, {
    cascade: true,
    eager: true,
  })
  events!: TransferEvent[];
}
