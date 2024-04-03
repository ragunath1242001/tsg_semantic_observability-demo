import {
  DataAddressDto,
  DataPlaneRequestResponseDto,
  TransferRequestMessageDto,
  TransferState,
} from "@tsg-dsp/common";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class TransferDao {
  @PrimaryColumn()
  id!: string;

  @Column()
  role!: "provider" | "consumer";

  @Column()
  processId!: string;

  @Column({ nullable: true })
  secret?: string;

  @Column()
  state!: TransferState;

  @Column("simple-json")
  request!: TransferRequestMessageDto;

  @Column("simple-json")
  response!: DataPlaneRequestResponseDto;

  @Column("simple-json", { nullable: true })
  dataAddress?: DataAddressDto;

  @CreateDateColumn()
  createdDate!: Date;

  @UpdateDateColumn()
  modifiedDate!: Date;

  @DeleteDateColumn()
  deletedDate!: Date;
}
