import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { MetaEntity } from "../common.dao";
import { DatasetDao } from "../dsp/catalog/catalog.dao";
import { Dataset } from "../dsp/catalog/catalog";
import { IDataPlane, HealthStatus } from "./dataPlanes";

@Entity({name: "dataplanedetails"})
export class DataPlaneDao extends MetaEntity implements IDataPlane {
    @PrimaryColumn()
    identifier!: string;
    @Column("simple-json", {nullable: true})
    created?: Date;
    @Column("simple-json", {nullable: true})
    modified?: Date;
    @Column()
    health!: HealthStatus;
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
    @Column()
    catalogSynchronization!: "push" | "pull";
    @Column()
    role!: "consumer" | "provider" | "both";
}