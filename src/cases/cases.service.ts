import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Case } from './case.entity';
import { Caller } from '../callers/caller.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LocationsService } from '../locations/locations.service';
import { Location } from '../locations/location.entity';
import {
  AuditAction,
  ActorType,
  AiCategory,
  CaseStatus,
  CaseUrgency,
} from '../common/enums';
import { CaseFilterDto } from './dto/case-filter.dto';
import { AdminUser } from '../admin-users/admin-user.entity';

export interface CreateFromAiParams {
  caller: Caller;
  callSid: string;
  transcript: string;
  name?: string;
  categories: string[];
  description: string;
  location?: {
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
  };
  issueLocation?: {
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
  };
  urgency?: CaseUrgency;
  aiAudioUrl?: string;
}

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly auditLogsService: AuditLogsService,
    private readonly locationsService: LocationsService,
  ) {}

  /**
   * Create a case from AI processing results (called by voice pipeline).
   */
  async createFromAi(params: CreateFromAiParams): Promise<Case> {
    const mappedCategories = params.categories.map((cat) => {
      const enumValue = Object.values(AiCategory).find(
        (v) => (v as string) === cat,
      );
      return enumValue ?? AiCategory.OTHER;
    });

    // 1. Resolve Case Location (Issue Location)
    let caseLocation: Location | null = null;
    if (params.issueLocation?.district) {
      caseLocation = await this.locationsService.findMatch(
        params.issueLocation.district,
        params.issueLocation.sector,
        params.issueLocation.cell,
        params.issueLocation.village,
      );
    }

    // 2. Update Caller Info (Residence & Name)
    let callerUpdated = false;
    if (params.location?.district) {
      params.caller.district = params.location.district;
      if (params.location.sector) params.caller.sector = params.location.sector;
      callerUpdated = true;
    }
    if (params.name) {
      params.caller.name = params.name;
      callerUpdated = true;
    }

    if (callerUpdated) {
      await this.em.persist(params.caller).flush();
    }

    // 3. Find or Create Case by callSid
    let caseEntity = await this.em.findOne(Case, { callSid: params.callSid });

    if (caseEntity) {
      this.logger.log(`Updating existing case for call ${params.callSid}`);
      caseEntity.transcript = params.transcript;
      caseEntity.description = params.description;
      caseEntity.categories = mappedCategories;
      caseEntity.location = caseLocation ?? caseEntity.location;
      caseEntity.urgency = params.urgency ?? caseEntity.urgency;
      caseEntity.updatedAt = new Date();
    } else {
      this.logger.log(`Creating new case for call ${params.callSid}`);
      caseEntity = this.em.create(Case, {
        caller: params.caller,
        callSid: params.callSid,
        transcript: params.transcript,
        description: params.description,
        categories: mappedCategories,
        aiAudioUrl: params.aiAudioUrl,
        location: caseLocation,
        status: CaseStatus.OPEN,
        urgency: params.urgency ?? CaseUrgency.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await this.em.persist(caseEntity).flush();

    await this.auditLogsService.create(
      caseEntity,
      caseEntity.createdAt === caseEntity.updatedAt
        ? AuditAction.CASE_CREATED
        : AuditAction.NOTE_ADDED,
      ActorType.AI,
      undefined,
      `Case processed/updated from call ${params.callSid}`,
    );

    return caseEntity;
  }

  /**
   * Get paginated and filtered cases for admin dashboard.
   */
  async findAll(filter: CaseFilterDto) {
    const where: FilterQuery<Case> = {};

    if (filter.status) where.status = filter.status;
    if (filter.urgency) where.urgency = filter.urgency;
    if (filter.category) where.categories = { $contains: [filter.category] };
    if (filter.district) where.location = { district: filter.district };
    if (filter.dateFrom)
      where.createdAt = {
        ...(where.createdAt as object),
        $gte: new Date(filter.dateFrom),
      };
    if (filter.dateTo)
      where.createdAt = {
        ...(where.createdAt as object),
        $lte: new Date(filter.dateTo),
      };

    const offset = (filter.page - 1) * filter.limit;

    const [data, total] = await this.em.findAndCount(Case, where, {
      populate: ['caller', 'location', 'assignedTo'],
      orderBy: { createdAt: 'DESC' },
      limit: filter.limit,
      offset,
    });

    return { data, total, page: filter.page, limit: filter.limit };
  }

  /**
   * Get a single case by ID with full details.
   */
  async findById(id: string): Promise<Case> {
    const caseEntity = await this.em.findOne(
      Case,
      { id },
      { populate: ['caller', 'location', 'assignedTo'] },
    );

    if (!caseEntity) {
      throw new NotFoundException(`Case ${id} not found`);
    }

    return caseEntity;
  }

  /**
   * Get all cases for a specific caller.
   */
  async findByCallerId(callerId: string) {
    return this.em.find(
      Case,
      { caller: { id: callerId } },
      { populate: ['location'], orderBy: { createdAt: 'DESC' } },
    );
  }

  async updateStatus(
    id: string,
    status: CaseStatus,
    adminId: string,
  ): Promise<Case> {
    const caseEntity = await this.findById(id);
    const oldStatus = caseEntity.status;
    caseEntity.status = status;
    await this.em.flush();

    await this.auditLogsService.create(
      caseEntity,
      AuditAction.STATUS_CHANGE,
      ActorType.ADMIN,
      adminId,
      `Status changed from ${oldStatus} to ${status}`,
    );

    return caseEntity;
  }

  async assignCase(
    id: string,
    adminUserId: string,
    assignedByAdminId: string,
  ): Promise<Case> {
    const caseEntity = await this.findById(id);
    const adminUser = await this.em.findOneOrFail(AdminUser, {
      id: adminUserId,
    });
    caseEntity.assignedTo = adminUser;
    await this.em.flush();

    await this.auditLogsService.create(
      caseEntity,
      AuditAction.ASSIGNMENT,
      ActorType.ADMIN,
      assignedByAdminId,
      `Assigned to admin ${adminUserId}`,
    );

    return caseEntity;
  }

  async updateNotes(id: string, notes: string, adminId: string): Promise<Case> {
    const caseEntity = await this.findById(id);
    caseEntity.resolutionNotes = notes;
    await this.em.flush();

    await this.auditLogsService.create(
      caseEntity,
      AuditAction.NOTE_ADDED,
      ActorType.ADMIN,
      adminId,
      notes,
    );

    return caseEntity;
  }

  async updateLocation(
    id: string,
    locationId: string,
    adminId: string,
  ): Promise<Case> {
    const location = await this.locationsService.findById(locationId);
    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    const caseEntity = await this.findById(id);
    caseEntity.location = location;
    await this.em.flush();

    await this.auditLogsService.create(
      caseEntity,
      AuditAction.LOCATION_SET,
      ActorType.ADMIN,
      adminId,
      `Location set to ${location.district}${location.sector ? ' > ' + location.sector : ''}`,
    );

    return caseEntity;
  }
}
