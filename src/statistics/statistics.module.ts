import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Case } from '../cases/case.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Case])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
