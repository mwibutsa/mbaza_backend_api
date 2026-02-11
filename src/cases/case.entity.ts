import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Caller } from '../callers/caller.entity';
import { Location } from '../locations/location.entity';
import { AdminUser } from '../admin-users/admin-user.entity';
import { CaseStatus } from '../common/enums/case-status.enum';
import { CaseUrgency } from '../common/enums/case-urgency.enum';
import { AiCategory } from '../common/enums/ai-category.enum';

@Entity({ tableName: 'cases' })
export class Case {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Caller)
  caller!: Caller;

  @ManyToOne(() => Location, { nullable: true })
  location?: Location;

  @Property({ unique: true })
  callSid!: string;

  @Enum({ items: () => AiCategory, array: true, default: [] })
  categories: AiCategory[] = [];

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  transcript?: string;

  @Enum(() => CaseUrgency)
  urgency: CaseUrgency = CaseUrgency.MEDIUM;

  @Enum(() => CaseStatus)
  status: CaseStatus = CaseStatus.OPEN;

  @Property({ nullable: true })
  aiAudioUrl?: string;

  @Property({ type: 'text', nullable: true })
  resolutionNotes?: string;

  @ManyToOne(() => AdminUser, { nullable: true })
  assignedTo?: AdminUser;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
