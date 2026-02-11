import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuditLog } from './audit-log.entity';
import { Case } from '../cases/case.entity';
import { AuditAction, ActorType } from '../common/enums';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly em: EntityManager) {}

  async create(
    caseEntity: Case,
    action: AuditAction,
    actorType: ActorType,
    actorId?: string,
    details?: string,
  ): Promise<AuditLog> {
    const log = this.em.create(AuditLog, {
      case: caseEntity,
      action,
      actorType,
      actorId,
      details,
      createdAt: new Date(),
    });

    await this.em.persist(log).flush();
    this.logger.debug(
      `Audit: ${action} on case ${caseEntity.id} by ${actorType}`,
    );
    return log;
  }

  async findByCase(caseId: string): Promise<AuditLog[]> {
    return this.em.find(
      AuditLog,
      { case: { id: caseId } },
      { orderBy: { createdAt: 'DESC' } },
    );
  }
}
