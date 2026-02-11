import { Injectable, Logger } from '@nestjs/common';

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
   * Combine multiple Base64-encoded Twilio media chunks into a single WAV buffer.
   */
  chunksToWav(base64Chunks: Buffer[]): Buffer {
    const totalSize = base64Chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const combined = Buffer.concat(base64Chunks, totalSize);
    this.logger.log(
      `Combining ${base64Chunks.length} chunks (${totalSize} bytes) into WAV`,
    );
    return this.mulawToWav(combined);
  }
}
