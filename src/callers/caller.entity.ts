import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity()
export class Caller {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ unique: true })
  phoneNumber!: string;

  @Property({ nullable: true })
  name?: string;

  /** Caller's residence district (not necessarily the case location) */
  @Property({ nullable: true })
  district?: string;

  /** Caller's residence sector */
  @Property({ nullable: true })
  sector?: string;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
