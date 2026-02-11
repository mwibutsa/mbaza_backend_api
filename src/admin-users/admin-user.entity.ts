import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { UserRole } from '../common/enums/user-role.enum';

@Entity()
export class AdminUser {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property()
  fullName!: string;

  @Enum(() => UserRole)
  role: UserRole = UserRole.ADMIN;

  @Property({ default: true })
  isActive: boolean = true;

  @Property()
  createdAt: Date = new Date();
}
