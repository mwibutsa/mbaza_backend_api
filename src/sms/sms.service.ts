import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: Twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid =
      this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken =
      this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.getOrThrow<string>(
      'TWILIO_PHONE_NUMBER',
    );
    this.twilioClient = Twilio(accountSid, authToken);
  }

  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        body: `Your Mbaza verification code is: ${code}. It expires in 5 minutes.`,
        from: this.fromNumber,
        to: phoneNumber,
      });
      this.logger.log(`OTP sent to ${phoneNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP to ${phoneNumber}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
