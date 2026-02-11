import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './admin-user.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly em: EntityManager) {}

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const existing = await this.em.findOne(AdminUser, { email: dto.email });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const admin = this.em.create(AdminUser, {
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      isActive: true,
      createdAt: new Date(),
    });

    await this.em.persist(admin).flush();
    return admin;
  }

  async findAll(): Promise<AdminUser[]> {
    return this.em.find(AdminUser, {}, { orderBy: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<AdminUser | null> {
    return this.em.findOne(AdminUser, { id });
  }
}
