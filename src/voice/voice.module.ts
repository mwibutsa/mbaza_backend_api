import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { AudioStreamGateway } from './audio-stream.gateway';
import { AudioConversionService } from './audio-conversion.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { CallersModule } from '../callers/callers.module';
import { CasesModule } from '../cases/cases.module';
import { SmsModule } from '../sms/sms.module';
import { AiServicesModule } from '../ai-services/ai-services.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    AiGatewayModule,
    AiServicesModule,
    CasesModule,
    CallersModule,
    SmsModule,
  ],
  controllers: [VoiceController],
  providers: [VoiceService, AudioStreamGateway, AudioConversionService],
})
export class VoiceModule {}
