import { Injectable, Logger } from '@nestjs/common';
// import * as googleTTS from 'google-tts-api';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TextToSpeechService {
  private readonly logger = new Logger(TextToSpeechService.name);
  private readonly thinkingCachePath = path.join(
    __dirname,
    'assets',
    'thinking.mp3',
  );

  constructor() {
    this.ensureAssetsDir();
  }

  private ensureAssetsDir() {
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
  }

  /**
   * Generates audio buffer from text using Google Cloud TTS (Kinyarwanda).
   */
  async generateAudio(text: string): Promise<Buffer> {
    try {
      this.logger.log(`Generating audio for: "${text}"`);

      const apiKey = process.env.GEMINI_API_KEY;
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      const requestBody = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          ssmlGender: 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Cloud TTS returned ${response.status}: ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as { audioContent: string };
      if (!data.audioContent) {
        throw new Error('Google Cloud TTS returned no audio content');
      }

      const buffer = Buffer.from(data.audioContent, 'base64');

      // Verify we got an MP3 (basic check)
      if (buffer.length < 100) {
        throw new Error('Google Cloud TTS returned suspiciously small buffer');
      }

      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate audio', error);
      throw error;
    }
  }

  /**
   * ensure the "Thinking" audio exists in cache, or generate it.
   * Returns the buffer for immediate playback.
   */
  async getThinkingAudio(): Promise<Buffer> {
    if (fs.existsSync(this.thinkingCachePath)) {
      return fs.readFileSync(this.thinkingCachePath);
    }

    this.logger.log('Generating "Thinking" audio cache...');
    const buffer = await this.generateAudio('Please wait, I am thinking...');
    fs.writeFileSync(this.thinkingCachePath, buffer);
    return buffer;
  }
}
