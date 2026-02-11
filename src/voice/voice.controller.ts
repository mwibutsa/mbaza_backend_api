import { Controller, Post, Req, Res, Logger, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import Twilio from 'twilio';

interface TwilioCallBody {
  CallSid?: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  Direction?: string;
}

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Twilio webhook handler for incoming calls.
   *
   * When a citizen calls the Twilio number, this endpoint returns TwiML that:
   *  1. Greets the caller in Kinyarwanda
   *  2. Opens a bidirectional Media Stream to our WebSocket gateway
   *
   * Configure this URL in Twilio Console:
   *   Phone Number → "A call comes in" → POST https://{your-domain}/api/v1/voice/incoming-call
   */
  @Post('incoming-call')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Twilio incoming call webhook',
    description:
      'Receives incoming call events from Twilio and responds with TwiML ' +
      'to greet the caller in Kinyarwanda and open a Media Stream for real-time audio processing.',
  })
  @ApiResponse({
    status: 200,
    description: 'TwiML response with greeting and media stream connection',
  })
  handleIncomingCall(@Req() req: Request, @Res() res: Response) {
    const body = req.body as TwilioCallBody;
    const callSid = body?.CallSid ?? 'unknown';
    const from = body?.From ?? 'unknown';
    this.logger.log(`Incoming call from ${from} (CallSid: ${callSid})`);

    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    // Convert http(s):// to ws(s)://
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/audio-stream';

    const twiml = new Twilio.twiml.VoiceResponse();

    // Greet the citizen in Kinyarwanda
    twiml.say(
      { language: 'en' as Parameters<typeof twiml.say>[0]['language'] },
      'Muraho, ikaze kuri Mbaza. Tuvugishe ikibazo cyawe.',
    );

    // Pause briefly before starting the stream
    twiml.pause({ length: 1 });

    // Open a Media Stream to our WebSocket gateway
    const connect = twiml.connect();
    const stream = connect.stream({ url: wsUrl });
    stream.parameter({ name: 'callerPhone', value: from });
    stream.parameter({ name: 'callSid', value: callSid });

    this.logger.log(`TwiML response generated, streaming to ${wsUrl}`);

    res.type('text/xml');
    res.send(twiml.toString());
  }

  @Post('status-callback')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Twilio call status callback',
    description:
      'Receives call status updates from Twilio (ringing, in-progress, completed, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status update acknowledged',
  })
  handleStatusCallback(@Req() req: Request) {
    const body = req.body as TwilioCallBody;
    this.logger.log(
      `Call status update: CallSid=${body?.CallSid ?? 'unknown'}, Status=${body?.CallStatus ?? 'unknown'}`,
    );
    return { received: true };
  }
}
