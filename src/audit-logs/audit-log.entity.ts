import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Case } from '../cases/case.entity';
import { AuditAction } from '../common/enums/audit-action.enum';
import { ActorType } from '../common/enums/actor-type.enum';

@Entity()
export class AuditLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Case)
  case!: Case;

  @Enum(() => AuditAction)
  action!: AuditAction;

  @Enum(() => ActorType)
  actorType!: ActorType;

  @Property({ nullable: true })
  actorId?: string;

  @Property({ type: 'text', nullable: true })
  details?: string;

  @Property()
  createdAt: Date = new Date();
}
