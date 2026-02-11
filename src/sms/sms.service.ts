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
    await this.sendSms(
      phoneNumber,
      `Your Mbaza verification code is: ${code}. It expires in 5 minutes.`,
    );
    this.logger.log(`OTP sent to ${phoneNumber}`);
  }

  async sendCaseConfirmation(
    phoneNumber: string,
    caseId: string,
  ): Promise<void> {
    await this.sendSms(
      phoneNumber,
      `Mbaza: Your inquiry has been received and registered (Ref: ${caseId.slice(0, 8).toUpperCase()}). ` +
        `You can track your case status anytime. Thank you for contacting us.`,
    );
    this.logger.log(`Case confirmation sent to ${phoneNumber}`);
  }

  private async sendSms(phoneNumber: string, body: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        body,
        from: this.fromNumber,
        to: phoneNumber,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
