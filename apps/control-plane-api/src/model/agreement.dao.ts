import { OwnableEntity } from "@tsg-dsp/common-api";
import { AgreementDto, HashedMessage } from "@tsg-dsp/common-dsp";
import { Resource } from "@tsg-dsp/common-dtos";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

import {
  EvaluationContext,
  EvaluationDecision
} from "../policy/evaluation.dto.js";

@Entity()
export class AgreementDao extends OwnableEntity {
  readonly resourceType = Resource.CP_AGREEMENT;

  @Column("simple-json")
  agreement!: AgreementDto;

  @Column({ type: String })
  negotiationId!: string;

  @Column("simple-json", { nullable: true })
  localSignature?: HashedMessage;

  @Column("simple-json", { nullable: true })
  remoteSignature?: HashedMessage;

  @OneToMany(() => TransferMonitorDao, (transfer) => transfer.agreement, {
    eager: false
  })
  transfers!: TransferMonitorDao[];
}

@Entity()
export class TransferMonitorDao {
  @PrimaryColumn({ type: String })
  id!: string;

  @ManyToOne(() => AgreementDao, (agreement) => agreement.transfers, {
    eager: true
  })
  agreement!: AgreementDao;

  @Column("simple-json", {
    transformer: {
      to: (instance) => instanceToPlain(instance),
      from: (plain) => plainToInstance(EvaluationContext, plain)
    }
  })
  lastContext!: EvaluationContext;

  @Column("simple-json")
  lastDecision!: EvaluationDecision;
}
