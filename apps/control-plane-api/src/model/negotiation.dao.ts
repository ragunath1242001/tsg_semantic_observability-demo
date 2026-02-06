import { MetaEntity, OwnableEntity } from "@tsg-dsp/common-api";
import {
  ContractAgreementVerificationMessage,
  ContractNegotiationState,
  HashedMessage,
  INegotiationDetail,
  INegotiationProcessEvent,
  Multilanguage,
  NegotiationProcessEvent,
  NegotiationRole,
  Offer
} from "@tsg-dsp/common-dsp";
import { Resource } from "@tsg-dsp/common-dtos";
import { Column, Entity, ManyToOne, OneToMany, Relation } from "typeorm";

import { AgreementDao } from "./agreement.dao.js";
import { jsonLdTransformer } from "./common.dao.js";

@Entity({ name: "negotationProcessEvent" })
export class NegotiationProcessEventDao
  extends MetaEntity
  implements INegotiationProcessEvent
{
  @Column({ type: String })
  time!: Date;
  @Column({ type: "simple-enum", enum: ContractNegotiationState })
  state!: ContractNegotiationState;
  @Column({ type: String, nullable: true })
  localMessage?: string;
  @Column({ type: String, nullable: true })
  code?: string;
  @Column("simple-json", { nullable: true })
  reason?: Array<Multilanguage>;
  @Column({ type: String, nullable: true })
  agreementMessage?: string;
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer
  })
  verification?: ContractAgreementVerificationMessage;
  @Column("simple-json", { nullable: true })
  hashedMessage?: HashedMessage;
  @Column({ type: String })
  type!: "local" | "remote";
  @ManyToOne(() => NegotiationDetailDao)
  _detail?: Relation<NegotiationDetailDao>;
}

@Entity({ name: "negotiationDetail" })
export class NegotiationDetailDao
  extends OwnableEntity
  implements INegotiationDetail
{
  readonly resourceType = Resource.CP_NEGOTIATION;

  @Column({ type: String })
  remoteId!: string;
  @Column({ type: String })
  remoteParty!: string;
  @Column({ type: String })
  role!: NegotiationRole;
  @Column({ type: String })
  remoteAddress!: string;
  @Column({ type: "simple-enum", enum: ContractNegotiationState })
  state!: ContractNegotiationState;
  @Column({ type: String })
  dataSet!: string;
  @Column("simple-json", {
    nullable: true,
    transformer: jsonLdTransformer
  })
  offer?: Offer;
  @ManyToOne(() => AgreementDao, {
    nullable: true,
    eager: true
  })
  agreementDao?: AgreementDao;
  @OneToMany(() => NegotiationProcessEventDao, (event) => event._detail, {
    cascade: true,
    eager: true
  })
  events!: Array<NegotiationProcessEvent>;
}
