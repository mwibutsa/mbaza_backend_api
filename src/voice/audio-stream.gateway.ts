import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { AudioConversionService } from './audio-conversion.service';
import { CallersService } from '../callers/callers.service';
import { CasesService } from '../cases/cases.service';
import { SmsService } from '../sms/sms.service';
import {
  TwilioStartMessage,
  TwilioMediaMessage,
  CallStreamState,
} from './voice.types';

interface RawTwilioMessage {
  event: string;
  sequenceNumber?: string;
  streamSid?: string;
  start?: TwilioStartMessage['start'];
  media?: TwilioMediaMessage['media'];
  stop?: { accountSid: string; callSid: string };
  mark?: { name: string };
}

/**
 * WebSocket gateway that receives real-time audio from Twilio Media Streams.
 *
 * Flow:
 *  1. Twilio opens a WS connection when a call starts (triggered by <Connect><Stream> TwiML)
 *  2. We receive `start` → `media` (many) → `stop` events
 *  3. On `stop`, we combine all audio chunks, convert to WAV, and send to Gradio AI
 *  4. The AI response (audio URL, transcript, categories) is logged for now
 *
 * MVP: One turn per call (citizen speaks → AI responds → call ends)
 */
@WebSocketGateway({ path: '/audio-stream' })
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AudioStreamGateway.name);

  /**
   * Track active call streams by their WebSocket connection.
   * Each connection = one Twilio call.
   */
  private activeCalls = new Map<WebSocket, CallStreamState>();

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly audioConversion: AudioConversionService,
    private readonly callersService: CallersService,
    private readonly casesService: CasesService,
    private readonly smsService: SmsService,
  ) {}

  handleConnection(client: WebSocket) {
    this.logger.log('Twilio Media Stream connected');
    client.on('message', (data: Buffer | string) => {
      this.handleMessage(client, data);
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Twilio Media Stream disconnected');
    this.activeCalls.delete(client);
  }

  /**
   * Route incoming Twilio WebSocket messages to the appropriate handler.
   */
  private handleMessage(client: WebSocket, raw: Buffer | string) {
    try {
      const message = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString('utf-8'),
      ) as RawTwilioMessage;

      switch (message.event) {
        case 'connected':
          this.logger.log('Stream connected event received');
          break;

        case 'start':
          if (message.start) {
            this.handleStart(client, message.start);
          }
          break;

        case 'media':
          if (message.media) {
            this.handleMedia(client, message.media);
          }
          break;

        case 'stop':
          void this.handleStop(client);
          break;

        case 'mark':
          this.logger.debug(`Mark event: ${message.mark?.name}`);
          break;

        default:
          this.logger.debug(`Unknown event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error('Failed to parse Twilio stream message', error);
    }
  }

  /**
   * Handle the `start` event — initialize state for this call.
   */
  private handleStart(client: WebSocket, start: TwilioStartMessage['start']) {
    const { callSid, streamSid, customParameters } = start;
    const callerPhone = customParameters?.callerPhone ?? 'unknown';
    this.logger.log(
      `Call started — CallSid: ${callSid}, StreamSid: ${streamSid}, From: ${callerPhone}`,
    );

    this.activeCalls.set(client, {
      callSid,
      streamSid,
      callerPhone,
      audioChunks: [],
      startedAt: new Date(),
    });
  }

  /**
   * Handle `media` events — buffer the incoming audio chunks.
   */
  private handleMedia(client: WebSocket, media: TwilioMediaMessage['media']) {
    const state = this.activeCalls.get(client);
    if (!state) {
      this.logger.warn('Received media for unknown call, ignoring');
      return;
    }

    const chunk = this.audioConversion.decodeBase64Chunk(media.payload);
    state.audioChunks.push(chunk);
  }

  /**
   * Handle the `stop` event — process accumulated audio through AI.
   */
  private async handleStop(client: WebSocket) {
    const state = this.activeCalls.get(client);
    if (!state) {
      this.logger.warn('Received stop for unknown call, ignoring');
      return;
    }

    const { callSid, callerPhone, audioChunks, startedAt } = state;
    const duration = (Date.now() - startedAt.getTime()) / 1000;

    this.logger.log(
      `Call ${callSid} ended — ${audioChunks.length} chunks received over ${duration.toFixed(1)}s`,
    );

    if (audioChunks.length === 0) {
      this.logger.warn(`No audio chunks received for call ${callSid}`);
      this.activeCalls.delete(client);
      return;
    }

    try {
      // Convert mulaw chunks → WAV
      const wavBuffer = this.audioConversion.chunksToWav(audioChunks);

      // Send to Gradio AI
      this.logger.log(`Sending ${wavBuffer.length} bytes to AI for processing`);
      const aiResponse = await this.aiGateway.processAudio(wavBuffer);

      this.logger.log(`=== AI Response for call ${callSid} ===`);
      this.logger.log(`Transcript: ${aiResponse.transcript}`);
      this.logger.log(`Categories: ${aiResponse.categories.join(', ')}`);
      this.logger.log(`Audio URL: ${aiResponse.audioFile.url}`);
      this.logger.log(`=================================`);

      // --- Phase 2: Persist caller and case ---
      const caller = await this.callersService.findOrCreate(callerPhone);

      const newCase = await this.casesService.createFromAi({
        caller,
        callSid,
        transcript: aiResponse.transcript,
        categories: aiResponse.categories,
        description: aiResponse.transcript.split('\n')[0] ?? '',
        aiAudioUrl: aiResponse.audioFile.url,
      });

      this.logger.log(`Case ${newCase.id} created for call ${callSid}`);

      // Send SMS confirmation to the caller
      if (callerPhone !== 'unknown') {
        try {
          await this.smsService.sendCaseConfirmation(callerPhone, newCase.id);
        } catch {
          this.logger.warn(`Failed to send SMS confirmation to ${callerPhone}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process audio for call ${callSid}`,
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.activeCalls.delete(client);
    }
  }
}
