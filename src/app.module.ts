import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VoiceModule } from './voice/voice.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { AiServicesModule } from './ai-services/ai-services.module';
import { AuthModule } from './auth/auth.module';
import { CallersModule } from './callers/callers.module';
import { LocationsModule } from './locations/locations.module';
import { CasesModule } from './cases/cases.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SmsModule } from './sms/sms.module';

import config from './mikro-orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(config),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AiGatewayModule,
    AiServicesModule,
    VoiceModule,
    AuthModule,
    CallersModule,
    LocationsModule,
    CasesModule,
    AdminUsersModule,
    AuditLogsModule,
    StatisticsModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
