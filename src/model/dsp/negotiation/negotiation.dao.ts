import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, Relation } from "typeorm";
import { MetaEntity, MetaEntityWithoutPrimary } from "../../common.dao";
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
    @Column({nullable: true})
    localMessage?: string;
    @Column({nullable: true})
    code?: string;
    @Column("simple-json", {nullable: true})
    reason?: Array<Multilanguage>
    @Column({nullable: true})
    agreementMessage?: string;
    @Column("simple-json", {nullable: true})
    verification?: ContractAgreementVerificationMessage
    @Column()
    type!: "local" | "remote"
    @ManyToOne(() => NegotiationDetailDao)
    _detail?: Relation<NegotiationDetailDao>
}

@Entity({name: "negotiationDetail"})
export class NegotiationDetailDao extends MetaEntityWithoutPrimary implements INegotiationDetail {
    @PrimaryColumn()
    localId!: string
    @Column()
    remoteId!: string
    @Column()
    remoteParty!: string;
    @Column()
    role!: NegotiationRole
    @Column()
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