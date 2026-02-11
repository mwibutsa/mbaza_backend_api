import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@gradio/client';
import { AiResponse } from './ai-gateway.types';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class AiGatewayService implements OnModuleInit {
  private readonly logger = new Logger(AiGatewayService.name);
  private gradioUrl: string;
  private speakerWavBlob: Blob | null = null;

  constructor(private readonly configService: ConfigService) {
    this.gradioUrl = this.configService.getOrThrow<string>('GRADIO_API_URL');
  }

  onModuleInit() {
    this.loadSpeakerWav();
  }

  /**
   * Load the reference speaker WAV file for voice cloning.
   * This is the voice the AI will use when generating responses.
   */
  private loadSpeakerWav(): void {
    const speakerPath = path.join(__dirname, 'assets', 'speaker.wav');

    try {
      const buffer = fs.readFileSync(speakerPath);
      this.speakerWavBlob = new Blob([buffer], { type: 'audio/wav' });
      this.logger.log('Speaker WAV loaded successfully');
    } catch {
      this.logger.warn(
        `Speaker WAV not found at ${speakerPath}. ` +
          'Will attempt to use a remote sample as fallback.',
      );
    }
  }

  /**
   * Get the speaker WAV blob — loads from file or falls back to a remote sample.
   */
  private async getSpeakerWav(): Promise<Blob> {
    if (this.speakerWavBlob) {
      return this.speakerWavBlob;
    }

    // Fallback: fetch a sample audio from the web
    this.logger.warn('Using remote fallback for speaker WAV');
    const response = await fetch(
      'https://github.com/gradio-app/gradio/raw/main/test/test_files/audio_sample.wav',
    );
    return response.blob();
  }

  /**
   * Process a citizen's audio through the Gradio AI service.
   *
   * @param audioBuffer - The citizen's recorded audio as a Buffer (WAV format)
   * @returns The AI's response: audio file, transcript, and categories
   */
  async processAudio(audioBuffer: Buffer): Promise<AiResponse> {
    this.logger.log(
      `Connecting to Gradio AI at ${this.gradioUrl} (audio size: ${audioBuffer.length} bytes)`,
    );

    const client = await Client.connect(this.gradioUrl);

    const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
      type: 'audio/wav',
    });
    const speakerWav = await this.getSpeakerWav();

    this.logger.log('Sending audio to Gradio /process_audio...');

    const result = await client.predict('/process_audio', {
      audio_path: audioBlob,
      speaker_wav: speakerWav,
    });

    const data = result.data as [
      {
        path: string;
        url: string;
        size: number | null;
        orig_name: string;
        mime_type: string | null;
        is_stream: boolean;
      },
      string,
      string[],
    ];

    this.logger.log(`AI response received. Categories: ${data[2].join(', ')}`);

    return {
      audioFile: {
        url: data[0].url,
        path: data[0].path,
        origName: data[0].orig_name,
        size: data[0].size,
        mimeType: data[0].mime_type,
        isStream: data[0].is_stream,
      },
      transcript: data[1],
      categories: data[2],
    };
  }

  /**
   * Get the publicly accessible URL of the AI's response audio.
   */
  getResponseAudioUrl(response: AiResponse): string {
    return response.audioFile.url;
  }
}
