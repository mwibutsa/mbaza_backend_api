import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../admin-users/admin-user.entity';
import { UserRole } from '../common/enums';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const existing = await em.findOne(AdminUser, {
      email: 'admin@mbaza.rw',
    });

    if (existing) {
      console.log('Super admin already exists, skipping seed');
      return;
    }

    const passwordHash = await bcrypt.hash('MbazaAdmin2024!', 12);

    const admin = em.create(AdminUser, {
      email: 'admin@mbaza.rw',
      passwordHash,
      fullName: 'Mbaza Super Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      createdAt: new Date(),
    });

    await em.persist(admin).flush();
    console.log('✅ Super admin created: admin@mbaza.rw / MbazaAdmin2024!');
  }
}
