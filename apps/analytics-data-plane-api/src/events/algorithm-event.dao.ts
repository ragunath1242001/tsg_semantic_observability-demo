import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation
} from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";
import { getBinaryColumnType } from "../utils/get-binary-column-type.js";

@Entity()
export class AlgorithmEventDao {
  // Internal db id
  @PrimaryColumn({ type: String })
  id!: string;

  // External event id
  @Column({ type: String, unique: true })
  eventId!: string;

  @ManyToOne(() => AlgorithmInstanceDao)
  @JoinColumn()
  algorithmInstance!: Relation<AlgorithmInstanceDao>;

  @Column({ type: String })
  name!: string;

  @Column({ type: Number, unique: true })
  number!: number;

  @Column({ type: Date })
  timestamp!: Date;

  @Column({
    type: getBinaryColumnType(),
    nullable: true
  })
  data!: Buffer | null;

  @Column({
    type: Boolean
  })
  isOwnEvent!: boolean;

  @Column({ type: String, nullable: true })
  transferId?: string;

  @Column({ type: String })
  createdBy!: string;

  @Column("simple-array", { nullable: true })
  recipients?: string[];
}
