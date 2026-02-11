import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Case } from './case.entity';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Case]),
    AuditLogsModule,
    LocationsModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
