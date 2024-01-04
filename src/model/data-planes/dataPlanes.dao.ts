import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { MetaEntity } from "../common.dao";
import { DatasetDao } from "../dsp/catalog/catalog.dao";
import { Dataset } from "../dsp/catalog/catalog";
import { IDataPlaneDetails, IDataPlaneStatus, HealthStatus, DataPlaneDetails } from "./dataPlanes";

@Entity({name: "dataplanestatus"})
export class DataPlaneStatusDao extends MetaEntity implements IDataPlaneStatus {
    @Column({unique: true})
    identifier!: string
    @Column("simple-json", {nullable: true})
    created?: Date;
    @Column("simple-json", {nullable: true})
    modified?: Date;
    @OneToOne(() => DataPlaneDetailsDao, {cascade: true, eager: true})
    @JoinColumn()
    details!: DataPlaneDetails
    @Column("simple-enum")
    health!: HealthStatus
    @Column()
    missedHealthChecks!: number;
    @OneToOne(() => DatasetDao, {eager: true})
    @JoinColumn()
    _dataset?: DatasetDao | undefined
    get dataset(): Dataset | undefined {
        return (this._dataset) ? new Dataset(this._dataset) : undefined
    }
    @Column({nullable: true})
    etag?: string;
}

@Entity({name: "dataplanedetails"})
export class DataPlaneDetailsDao extends MetaEntity implements IDataPlaneDetails{
    @Column({unique: true})
    identifier!: string
    @Column()
    dataplaneType!: string;
    @Column()
    endpointPrefix!: string;
    @Column()
    callbackAddress!: string;
    @Column()
    managementAddress!: string;
    @Column()
    managementToken!: string;
    @Column("simple-enum")
    catalogSynchronization!: "push" | "pull";
    @Column("simple-enum")
    role!: "consumer" | "provider" | "both";
}