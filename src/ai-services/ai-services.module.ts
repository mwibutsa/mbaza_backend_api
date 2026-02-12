import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { TextToSpeechService } from './text-to-speech.service';

@Module({
  imports: [ConfigModule],
  providers: [GeminiService, TextToSpeechService],
  exports: [GeminiService, TextToSpeechService],
})
export class AiServicesModule {}
