import { OwnableEntity } from "@tsg-dsp/common-api";
import {
  DataAddressDto,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import { Resource } from "@tsg-dsp/common-dtos";
import { Column, Entity, JoinColumn, ManyToOne, Relation } from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";

@Entity()
export class TransferDao extends OwnableEntity {
  readonly resourceType = Resource.DP_TRANSFER;

  @Column({ type: String })
  role!: "provider" | "consumer";

  @Column({ type: String })
  processId!: string;

  @Column({ type: String })
  remoteParty!: string;

  @Column({ type: String })
  datasetId!: string;

  @Column({ type: String, nullable: true })
  secret?: string;

  @Column({ type: "simple-enum", enum: TransferState })
  state!: TransferState;

  @Column("simple-json")
  request!: TransferRequestMessageDto;

  @Column("simple-json")
  response!: DataPlaneRequestResponseDto;

  @Column("simple-json", { nullable: true })
  dataAddress?: DataAddressDto;

  @ManyToOne(
    () => AlgorithmInstanceDao,
    (algorithmInstance) => algorithmInstance.transfers,
    { nullable: true }
  )
  @JoinColumn()
  algorithmInstance?: Relation<AlgorithmInstanceDao>;
}
