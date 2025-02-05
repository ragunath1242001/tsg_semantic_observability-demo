import {
  DataAddressDto,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState
} from "@tsg-dsp/common-dsp";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";

@Entity()
export class TransferDao {
  @PrimaryColumn({ type: String })
  id!: string;

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

  @CreateDateColumn({ type: String })
  createdDate!: Date;

  @UpdateDateColumn({ type: String })
  modifiedDate!: Date;

  @DeleteDateColumn({ type: String })
  deletedDate!: Date;
}
