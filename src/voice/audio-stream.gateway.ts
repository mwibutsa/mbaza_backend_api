import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { GeminiService, ExtractedData } from '../ai-services/gemini.service';
import { TextToSpeechService } from '../ai-services/text-to-speech.service';
import { AudioConversionService } from './audio-conversion.service';
import { CallersService } from '../callers/callers.service';
import { CasesService } from '../cases/cases.service';
import { SmsService } from '../sms/sms.service';
import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
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

interface AugmentedCallState extends CallStreamState {
  extractedData: ExtractedData;
  fullTranscript: string;
  silenceCounter: number; // Count of consecutive silent chunks
  isProcessing: boolean; // True if AI is currently thinking/speaking
}

@WebSocketGateway({ path: '/audio-stream' })
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(AudioStreamGateway.name);

  afterInit() {
    this.logger.log('AudioStreamGateway initialized');
  }
  private activeCalls = new Map<WebSocket, AugmentedCallState>();

  // Silence detection config
  private readonly SILENCE_THRESHOLD = 500; // RMS amplitude threshold (16-bit linear range)
  private readonly SILENCE_DURATION_CHUNKS = 50; // Approx 1.0 second (20ms chunks * 50)

  constructor(
    private readonly geminiService: GeminiService,
    private readonly ttsService: TextToSpeechService,
    private readonly audioConversion: AudioConversionService,
    private readonly callersService: CallersService,
    private readonly casesService: CasesService,
    private readonly smsService: SmsService,
    private readonly orm: MikroORM, // Required for CreateRequestContext
  ) {}

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log('Twilio Media Stream connected');
    const request = args[0] as IncomingMessage;
    if (request && request.headers) {
      this.logger.debug(
        `Connection headers: ${JSON.stringify(request.headers)}`,
      );
    }
    client.on('message', (data: Buffer | string) => {
      this.handleMessage(client, data);
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Twilio Media Stream disconnected');
    this.activeCalls.delete(client);
  }

  private handleMessage(client: WebSocket, raw: Buffer | string) {
    try {
      const message = JSON.parse(
        typeof raw === 'string' ? raw : raw.toString('utf-8'),
      ) as RawTwilioMessage;

      switch (message.event) {
        case 'start':
          if (message.start) void this.handleStart(client, message.start);
          break;
        case 'media':
          if (message.media) this.handleMedia(client, message.media);
          break;
        case 'stop':
          void this.handleStop(client);
          break;
        case 'mark':
          this.logger.debug(`Mark event: ${message.mark?.name}`);
          break;
      }
    } catch (error) {
      this.logger.error('Error parsing Twilio message', error);
    }
  }

  private async handleStart(
    client: WebSocket,
    start: TwilioStartMessage['start'],
  ) {
    const { callSid, streamSid, customParameters } = start;
    const callerPhone = customParameters?.callerPhone ?? 'unknown';
    this.logger.log(`Call started — CallSid: ${callSid}, From: ${callerPhone}`);

    const state: AugmentedCallState = {
      callSid,
      streamSid,
      callerPhone,
      audioChunks: [],
      startedAt: new Date(),
      extractedData: {},
      fullTranscript: '',
      silenceCounter: 0,
      isProcessing: false,
    };
    this.activeCalls.set(client, state);

    // Send initial English greeting (Non-Interactive)
    try {
      this.logger.log('Sending initial greeting for non-interactive flow...');
      const greetingText =
        'Hello, thank you for calling Mbaza. Please state your name, residence, and the issue you are reporting, then hang up when you are finished.';
      const mp3Audio = await this.ttsService.generateAudio(greetingText);
      const mulawAudio = await this.audioConversion.mp3ToMulaw(mp3Audio);
      this.sendAudio(client, streamSid, mulawAudio);
    } catch (error) {
      this.logger.error('Failed to send initial greeting', error);
    }
  }

  private handleMedia(client: WebSocket, media: TwilioMediaMessage['media']) {
    const state = this.activeCalls.get(client);
    if (!state || state.isProcessing) return;

    const payload = Buffer.from(media.payload, 'base64');
    state.audioChunks.push(payload);

    // Throttled VAD logic
    const rms = this.calculateRMS(payload);
    if (rms < this.SILENCE_THRESHOLD) {
      state.silenceCounter++;
    } else {
      state.silenceCounter = 0;
    }

    // Only process if:
    // 1. We have enough audio (e.g., > 5 seconds)
    // 2. We detected silence (> 2.0 seconds)
    // 3. We are not already processing
    // 4. At least 5 seconds have passed since the call started (avoid greeting noise)
    const audioDurationSec = (state.audioChunks.length * 20) / 1000;
    const isSilenceReached = state.silenceCounter >= 100; // 100 * 20ms = 2.0s

    if (isSilenceReached && audioDurationSec > 5 && !state.isProcessing) {
      this.logger.debug(
        `[VAD] Silence detected. Duration: ${audioDurationSec}s. Processing...`,
      );
      state.silenceCounter = 0; // Reset to avoid double trigger
      void this.processTurnInteractively(client, state);
    }
  }

  @CreateRequestContext()
  private async processTurnInteractively(
    client: WebSocket,
    state: AugmentedCallState,
  ) {
    state.isProcessing = true;
    try {
      const fullAudioMulaw = Buffer.concat(state.audioChunks);
      const wavAudio = await this.audioConversion.chunksToWav([fullAudioMulaw]);

      this.logger.log(
        `[AI] Processing live stream (${fullAudioMulaw.length} bytes)...`,
      );
      const aiResponse = await this.geminiService.processTurn(
        wavAudio,
        state.extractedData,
      );

      // Update transcript and extracted data
      state.fullTranscript = aiResponse.transcript;
      state.extractedData = {
        ...state.extractedData,
        ...aiResponse.extractedData,
      };

      this.logger.log(
        `[AI] Live extraction: ${JSON.stringify(state.extractedData)}`,
      );

      if (!aiResponse.isComplete && aiResponse.nextQuestion) {
        this.logger.log(`[TTS] Speaking follow-up: ${aiResponse.nextQuestion}`);
        const mp3Audio = await this.ttsService.generateAudio(
          aiResponse.nextQuestion,
        );
        const mulawAudio = await this.audioConversion.mp3ToMulaw(mp3Audio);
        this.sendAudio(client, state.streamSid, mulawAudio);
      } else if (aiResponse.isComplete) {
        this.logger.log(
          'Information complete. Waiting for user to hang up or final confirmation.',
        );
        const closingText =
          'Thank you for the information. We have recorded your report. You can hang up now.';
        const mp3Audio = await this.ttsService.generateAudio(closingText);
        const mulawAudio = await this.audioConversion.mp3ToMulaw(mp3Audio);
        this.sendAudio(client, state.streamSid, mulawAudio);
      }
    } catch (error) {
      this.logger.error('Failed to process interactive turn', error);
    } finally {
      // Add a longer cool-down period before allowing next VAD trigger
      setTimeout(() => {
        state.isProcessing = false;
      }, 5000);
    }
  }

  @CreateRequestContext()
  private async handleStop(client: WebSocket) {
    this.logger.log('Call stopped/User hung up. Starting final processing...');
    const state = this.activeCalls.get(client);
    if (state) {
      // Logic to finalize case creation if not already done or to update with final audio
      try {
        if (state.audioChunks.length > 0) {
          const fullAudioMulaw = Buffer.concat(state.audioChunks);
          const wavAudio = await this.audioConversion.chunksToWav([
            fullAudioMulaw,
          ]);
          const aiResponse = await this.geminiService.processTurn(
            wavAudio,
            state.extractedData,
          );

          this.logger.log(
            `Final AI Extraction: ${JSON.stringify(aiResponse.extractedData)}`,
          );

          const caller = await this.callersService.findOrCreate(
            state.callerPhone,
          );
          const newCase = await this.casesService.createFromAi({
            caller,
            callSid: state.callSid,
            name: aiResponse.extractedData.name ?? state.extractedData.name,
            transcript:
              aiResponse.transcript ||
              state.fullTranscript ||
              'No transcript generated',
            categories: [aiResponse.extractedData.category ?? 'Other'],
            description:
              aiResponse.extractedData.issue ?? 'No description provided',
            location:
              aiResponse.extractedData.location ?? state.extractedData.location,
            issueLocation:
              aiResponse.extractedData.issueLocation ??
              state.extractedData.issueLocation,
            urgency:
              aiResponse.extractedData.urgency ?? state.extractedData.urgency,
            aiAudioUrl: 'full-recording',
          });

          await this.smsService.sendCaseConfirmation(
            state.callerPhone,
            newCase.id,
          );
        }
      } catch (error) {
        this.logger.error('Failed to finalize call processing', error);
      } finally {
        this.activeCalls.delete(client);
      }
    }
  }

  // Helper methods below (VAD logic removed from main flow)
  private sendAudio(client: WebSocket, streamSid: string, buffer: Buffer) {
    const payload = buffer.toString('base64');
    const message = {
      event: 'media',
      streamSid,
      media: { payload },
    };
    client.send(JSON.stringify(message));
  }

  private calculateRMS(buffer: Buffer): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const mulaw = buffer[i] ^ 0xff;
      const s = mulaw & 0x7f;
      const exp = (mulaw & 0x70) >> 4;
      let sample = (s << 3) + 132;
      sample <<= exp;
      sample -= 132;
      const linear = mulaw & 0x80 ? -sample : sample;
      sum += linear * linear;
    }
    return Math.sqrt(sum / buffer.length);
  }
}
