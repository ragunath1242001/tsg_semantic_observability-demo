import {
  Agreement,
  ContractAgreementVerificationMessage,
  ContractNegotiationState,
  INegotiationDetail,
  INegotiationProcessEvent,
  Multilanguage,
  NegotiationProcessEvent,
  NegotiationRole,
  Offer,
} from "@tsg-dsp/common";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from "typeorm";
import { AutoIdEntity, MetaEntity } from "./common.dao";

@Entity({ name: "negotationProcessEvent" })
export class NegotiationProcessEventDao
  extends AutoIdEntity
  implements INegotiationProcessEvent
{
  @Column()
  time!: Date;
  @Column()
  state!: ContractNegotiationState;
  @Column({ nullable: true })
  localMessage?: string;
  @Column({ nullable: true })
  code?: string;
  @Column("simple-json", { nullable: true })
  reason?: Array<Multilanguage>;
  @Column({ nullable: true })
  agreementMessage?: string;
  @Column("simple-json", { nullable: true })
  verification?: ContractAgreementVerificationMessage;
  @Column()
  type!: "local" | "remote";
  @ManyToOne(() => NegotiationDetailDao)
  _detail?: Relation<NegotiationDetailDao>;
}

@Entity({ name: "negotiationDetail" })
export class NegotiationDetailDao
  extends MetaEntity
  implements INegotiationDetail
{
  @PrimaryColumn()
  localId!: string;
  @Column()
  remoteId!: string;
  @Column()
  remoteParty!: string;
  @Column()
  role!: NegotiationRole;
  @Column()
  remoteAddress!: string;
  @Column()
  state!: ContractNegotiationState;
  @Column()
  dataSet!: string;
  @Column("simple-json", { nullable: true })
  offer?: Offer;
  @Column("simple-json", { nullable: true })
  agreement?: Agreement;
  @Column({ nullable: true })
  agreementId?: string;
  @OneToMany(() => NegotiationProcessEventDao, (event) => event._detail, {
    cascade: true,
    eager: true,
  })
  events!: Array<NegotiationProcessEvent>;
}
