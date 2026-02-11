/**
 * Twilio Media Stream WebSocket message types.
 * @see https://www.twilio.com/docs/voice/media-streams/websocket-messages
 */

export interface TwilioStreamMessageBase {
  event: string;
  sequenceNumber: string;
  streamSid: string;
}

export interface TwilioConnectedMessage {
  event: 'connected';
  protocol: string;
  version: string;
}

export interface TwilioStartMessage extends TwilioStreamMessageBase {
  event: 'start';
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string; // 'audio/x-mulaw'
      sampleRate: number; // 8000
      channels: number; // 1
    };
  };
}

export interface TwilioMediaMessage extends TwilioStreamMessageBase {
  event: 'media';
  media: {
    track: string; // 'inbound'
    chunk: string;
    timestamp: string;
    payload: string; // Base64-encoded audio
  };
}

export interface TwilioStopMessage extends TwilioStreamMessageBase {
  event: 'stop';
  stop: {
    accountSid: string;
    callSid: string;
  };
}

export interface TwilioMarkMessage extends TwilioStreamMessageBase {
  event: 'mark';
  mark: {
    name: string;
  };
}

export type TwilioStreamMessage =
  | TwilioConnectedMessage
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage
  | TwilioMarkMessage;

/**
 * Tracks the state of an active call's audio stream.
 */
export interface CallStreamState {
  callSid: string;
  streamSid: string;
  callerPhone: string;
  audioChunks: Buffer[];
  startedAt: Date;
}
