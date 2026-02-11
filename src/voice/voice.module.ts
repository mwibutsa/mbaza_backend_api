import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { AudioStreamGateway } from './audio-stream.gateway';
import { AudioConversionService } from './audio-conversion.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { CallersModule } from '../callers/callers.module';
import { CasesModule } from '../cases/cases.module';

@Module({
  imports: [AiGatewayModule, CallersModule, CasesModule],
  controllers: [VoiceController],
  providers: [VoiceService, AudioStreamGateway, AudioConversionService],
})
export class VoiceModule {}
