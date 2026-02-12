import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

/**
 * Converts raw mulaw audio from Twilio Media Streams into WAV format
 * suitable for the Gradio AI service.
 *
 * Twilio streams audio as:
 *   - Encoding: audio/x-mulaw
 *   - Sample rate: 8000 Hz
 *   - Channels: 1 (mono)
 *   - Bit depth: 8-bit
 *
 * This service writes the raw mulaw data into a proper WAV container
 * using mulaw format tag (0x0007).
 */
@Injectable()
export class AudioConversionService {
  private readonly logger = new Logger(AudioConversionService.name);

  /**
   * Decode a Base64-encoded Twilio media payload into a raw buffer.
   */
  decodeBase64Chunk(base64Payload: string): Buffer {
    return Buffer.from(base64Payload, 'base64');
  }

  /**
   * Convert raw mulaw audio data into a WAV file buffer.
   *
   * @param mulawData - Raw mulaw audio bytes (concatenated from Twilio chunks)
   * @param sampleRate - Sample rate in Hz (default: 8000, Twilio's standard)
   * @param channels - Number of audio channels (default: 1, mono)
   * @returns A Buffer containing a valid WAV file
   */
  mulawToWav(
    mulawData: Buffer,
    sampleRate: number = 8000,
    channels: number = 1,
  ): Buffer {
    const bitsPerSample = 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = mulawData.length;

    // WAV header is 44 bytes
    const headerSize = 44;
    const wavBuffer = Buffer.alloc(headerSize + dataSize);

    // RIFF chunk descriptor
    wavBuffer.write('RIFF', 0); // ChunkID
    wavBuffer.writeUInt32LE(36 + dataSize, 4); // ChunkSize
    wavBuffer.write('WAVE', 8); // Format

    // fmt sub-chunk
    wavBuffer.write('fmt ', 12); // Subchunk1ID
    wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM/mulaw)
    wavBuffer.writeUInt16LE(0x0007, 20); // AudioFormat (7 = μ-law)
    wavBuffer.writeUInt16LE(channels, 22); // NumChannels
    wavBuffer.writeUInt32LE(sampleRate, 24); // SampleRate
    wavBuffer.writeUInt32LE(byteRate, 28); // ByteRate
    wavBuffer.writeUInt16LE(blockAlign, 32); // BlockAlign
    wavBuffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

    // data sub-chunk
    wavBuffer.write('data', 36); // Subchunk2ID
    wavBuffer.writeUInt32LE(dataSize, 40); // Subchunk2Size
    mulawData.copy(wavBuffer, headerSize); // Audio data

    this.logger.debug(
      `Converted ${dataSize} bytes of mulaw to WAV (${wavBuffer.length} bytes total)`,
    );

    return wavBuffer;
  }

  /**
   * Combine multiple Base64-encoded Twilio media chunks and convert to a standard WAV buffer (PCM 16-bit).
   * We use ffmpeg to ensure the format is standard and compatible with Gemini.
   */
  async chunksToWav(chunks: Buffer[]): Promise<Buffer> {
    const rawMulaw = Buffer.concat(chunks);

    return new Promise((resolve, reject) => {
      // -f mulaw: force input format to mulaw
      // -ar 8000: input sample rate 8k
      // -ac 1: input channels 1
      // -i pipe:0: read from stdin
      // Output: -f wav (defaults to pcm_s16le), pipe:1
      const args = [
        '-f',
        'mulaw',
        '-ar',
        '8000',
        '-ac',
        '1',
        '-i',
        'pipe:0',
        '-f',
        'wav',
        'pipe:1',
      ];

      const ffmpeg = spawn('ffmpeg', args);
      const outChunks: Buffer[] = [];

      ffmpeg.stdout.on('data', (chunk: Buffer) => outChunks.push(chunk));
      ffmpeg.stderr.on('data', (data: Buffer) => {
        this.logger.debug(`ffmpeg (mulawToWav) stderr: ${data.toString()}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(outChunks));
        } else {
          reject(new Error(`FFmpeg (mulawToWav) exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => reject(err));

      if (ffmpeg.stdin) {
        ffmpeg.stdin.write(rawMulaw);
        ffmpeg.stdin.end();
      } else {
        reject(new Error('Could not open ffmpeg stdin'));
      }
    });
  }

  /**
   * Convert MP3/WAV buffer from TTS to Mulaw 8kHz using ffmpeg (spawn).
   */
  async mp3ToMulaw(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Spawn ffmpeg process
      // Input from pipe:0 (stdin), Output to pipe:1 (stdout)
      // -f mulaw: force output format to mulaw (raw headerless)
      // -acodec pcm_mulaw: allow specific codec selection if needed, but -f mulaw usually implies pcm_mulaw
      // -ar 8000: sample rate 8000Hz
      // -ac 1: mono
      const args = [
        '-i',
        'pipe:0',
        '-f',
        'mulaw',
        '-acodec',
        'pcm_mulaw',
        '-ar',
        '8000',
        '-ac',
        '1',
        'pipe:1',
      ];

      const ffmpeg = spawn('ffmpeg', args);
      const chunks: Buffer[] = [];

      // Collect stdout
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Handle stderr (optional logging)
      ffmpeg.stderr.on('data', (data: Buffer) => {
        this.logger.debug(`ffmpeg stderr: ${data.toString()}`);
      });

      // Handle process exit
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const result = Buffer.concat(chunks);
          this.logger.debug(
            `Converted MP3 to Mulaw (spawn): ${inputBuffer.length} -> ${result.length} bytes`,
          );
          resolve(result);
        } else {
          this.logger.error(`FFmpeg process exited with code ${code}`);
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      // Handle process errors (e.g., spawn failed)
      ffmpeg.on('error', (err) => {
        this.logger.error('FFmpeg spawn error', err);
        reject(err);
      });

      // Write input buffer to stdin
      if (ffmpeg.stdin) {
        ffmpeg.stdin.write(inputBuffer);
        ffmpeg.stdin.end();
      } else {
        reject(new Error('Could not open ffmpeg stdin'));
      }
    });
  }
}
