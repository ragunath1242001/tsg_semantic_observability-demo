import { Column, Entity, ManyToOne, OneToMany, Relation } from "typeorm";
import { MetaEntity } from "../../common.dao";
import { ContractNegotiationState } from "./messages.dto";
import { Multilanguage } from "../common";
import { ContractAgreementVerificationMessage } from "./messages";
import { Agreement, INegotiationDetail, INegotiationProcessEvent, NegotiationProcessEvent, NegotiationRole, Offer } from "./negotiation";


@Entity({name: "negotationProcessEvent"})
export class NegotiationProcessEventDao extends MetaEntity implements INegotiationProcessEvent {
    @Column()
    time!: Date
    @Column("simple-enum")
    state!: ContractNegotiationState
    @Column("simple-json", {nullable: true})
    localMessage?: string;
    @Column("simple-json", {nullable: true})
    code?: string;
    @Column("simple-json", {nullable: true})
    reason?: Array<Multilanguage>
    @Column("simple-json", {nullable: true})
    agreementMessage?: string;
    @Column("simple-json", {nullable: true})
    verification?: ContractAgreementVerificationMessage
    @Column()
    type!: "local" | "remote"
    @ManyToOne(() => NegotiationDetailDao)
    _detail?: Relation<NegotiationDetailDao>
}

@Entity({name: "negotiationDetail"})
export class NegotiationDetailDao extends MetaEntity implements INegotiationDetail {
    @Column("simple-json")
    localId!: string
    @Column("simple-json")
    remoteId!: string
    @Column("simple-json")
    remoteParty!: string;
    @Column("simple-json")
    role!: NegotiationRole
    @Column("simple-json")
    remoteAddress!: string;
    @Column()
    state!: ContractNegotiationState;
    @Column()
    dataSet!: string;
    @Column("simple-json", {nullable: true})
    offer?: Offer
    @Column("simple-json", {nullable: true})
    agreement?: Agreement;
    @OneToMany(() => NegotiationProcessEventDao, (event) => event._detail, {cascade: true, eager: true})
    events!: Array<NegotiationProcessEvent>;
}