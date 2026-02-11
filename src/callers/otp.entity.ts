import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Caller } from './caller.entity';

@Entity()
export class Otp {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Caller)
  caller!: Caller;

  @Property({ length: 6 })
  code!: string;

  @Property()
  expiresAt!: Date;

  @Property({ default: false })
  isUsed: boolean = false;

  @Property()
  createdAt: Date = new Date();
}
