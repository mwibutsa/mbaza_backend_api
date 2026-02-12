import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Location } from './location.entity';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly em: EntityManager) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const location = this.em.create(Location, {
      ...dto,
      createdAt: new Date(),
    });
    await this.em.persist(location).flush();
    return location;
  }

  async findAll(): Promise<Location[]> {
    return this.em.find(
      Location,
      {},
      { orderBy: { district: 'ASC', sector: 'ASC' } },
    );
  }

  async findById(id: string): Promise<Location | null> {
    return this.em.findOne(Location, { id });
  }

  async findByDistrict(district: string): Promise<Location[]> {
    return this.em.find(Location, { district });
  }

  async findMatch(
    district?: string,
    sector?: string,
    cell?: string,
    village?: string,
  ): Promise<Location | null> {
    if (!district) return null;

    const where: FilterQuery<Location> = { district };
    if (sector) where.sector = sector;
    if (cell) where.cell = cell;
    if (village) where.village = village;

    return this.em.findOne(Location, where);
  }
}
