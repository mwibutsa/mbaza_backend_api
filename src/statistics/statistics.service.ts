import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Case } from '../cases/case.entity';
import { CaseStatus, CaseUrgency, AiCategory } from '../common/enums';

@Injectable()
export class StatisticsService {
  constructor(private readonly em: EntityManager) {}

  async getOverview() {
    const total = await this.em.count(Case);

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(CaseStatus)) {
      byStatus[status] = await this.em.count(Case, { status });
    }

    const byUrgency: Record<string, number> = {};
    for (const urgency of Object.values(CaseUrgency)) {
      byUrgency[urgency] = await this.em.count(Case, { urgency });
    }

    return { total, byStatus, byUrgency };
  }

  async getByCategory() {
    const result: Record<string, number> = {};
    for (const category of Object.values(AiCategory)) {
      result[category] = await this.em.count(Case, {
        categories: { $contains: [category] },
      });
    }
    return result;
  }

  async getByLocation() {
    const qb = this.em.createQueryBuilder(Case, 'c');
    const results = await qb
      .select(['l.district as district', 'count(*) as count'])
      .leftJoin('c.location', 'l')
      .where({ location: { $ne: null } })
      .groupBy('l.district')
      .execute<Array<{ district: string; count: string }>>();

    return results.map((r) => ({
      district: r.district,
      count: parseInt(r.count, 10),
    }));
  }

  async getTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const dateFormat =
      period === 'daily'
        ? 'YYYY-MM-DD'
        : period === 'weekly'
          ? 'IYYY-IW'
          : 'YYYY-MM';

    const qb = this.em.createQueryBuilder(Case, 'c');
    const results = await qb
      .select([
        `to_char(c.created_at, '${dateFormat}') as period`,
        'count(*) as count',
      ])
      .groupBy('period')
      .orderBy({ [`to_char(c.created_at, '${dateFormat}')`]: 'ASC' })
      .execute<Array<{ period: string; count: string }>>();

    return results.map((r) => ({
      period: r.period,
      count: parseInt(r.count, 10),
    }));
  }
}
