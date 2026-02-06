import { MetaEntity, OwnableEntity } from "@tsg-dsp/common-api";
import {
  DataAddress,
  DataPlaneTransferDto,
  ITransferEvent,
  ITransferStatus,
  Multilanguage,
  TransferEvent,
  TransferRole,
  TransferState
} from "@tsg-dsp/common-dsp";
import { Resource } from "@tsg-dsp/common-dtos";
import { Column, Entity, ManyToOne, OneToMany, Relation } from "typeorm";

import { jsonLdTransformer } from "./common.dao.js";

@Entity()
export class TransferEventDao extends MetaEntity implements ITransferEvent {
  @Column({ type: String })
  time!: Date;
  @Column({ type: "simple-enum", enum: TransferState })
  state!: TransferState;
  @Column({ type: String, nullable: true })
  localMessage?: string;
  @Column({ type: String, nullable: true })
  code?: string;
  @Column("simple-json", { nullable: true })
  reason?: Multilanguage[];
  @Column({ type: String })
  type!: "local" | "remote";
  @ManyToOne(() => TransferDetailDao)
  _status?: Relation<TransferDetailDao>;
}

@Entity()
export class TransferDetailDao
  extends OwnableEntity
  implements ITransferStatus
{
  readonly resourceType = Resource.CP_TRANSFER;

  @Column({ type: String, nullable: true })
  remoteId?: string;
  @Column({ type: String })
  role!: TransferRole;
  @Column({ type: String })
  remoteAddress!: string;
  @Column({ type: String })
  remoteParty!: string;
  @Column({ type: "simple-enum", enum: TransferState })
  state!: TransferState;
  @Column({ type: String })
  agreementId!: string;
  @Column({ type: String, nullable: true })
  format?: string;
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer
  })
  dataAddress?: DataAddress;
  @Column("simple-json")
  dataPlaneTransfer!: DataPlaneTransferDto;
  @OneToMany(() => TransferEventDao, (event) => event._status, {
    cascade: true,
    eager: true
  })
  events!: TransferEvent[];
}
