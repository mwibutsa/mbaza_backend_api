import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity()
export class Location {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property()
  district!: string;

  @Property({ nullable: true })
  sector?: string;

  @Property({ nullable: true })
  cell?: string;

  @Property({ nullable: true })
  village?: string;

  @Property()
  createdAt: Date = new Date();
}
