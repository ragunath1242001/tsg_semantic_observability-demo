import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation
} from "typeorm";

import { AlgorithmInstanceDao } from "../algorithm-instances/algorithm-instance.dao.js";

@Entity()
export class InternalEventDao {
  @PrimaryColumn({ type: String })
  id!: string;

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
    type: "simple-json",
    nullable: true
  })
  data?: object | null;
}
