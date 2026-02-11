import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Caller } from './caller.entity';
import { Otp } from './otp.entity';

@Injectable()
export class CallersService {
  private readonly logger = new Logger(CallersService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Find a caller by phone number, or create a new one if not found.
   */
  async findOrCreate(phoneNumber: string): Promise<Caller> {
    let caller = await this.em.findOne(Caller, { phoneNumber });

    if (!caller) {
      caller = this.em.create(Caller, {
        phoneNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.em.persist(caller).flush();
      this.logger.log(`New caller created: ${phoneNumber}`);
    }

    return caller;
  }

  async findById(id: string): Promise<Caller | null> {
    return this.em.findOne(Caller, { id });
  }

  async findByPhone(phoneNumber: string): Promise<Caller | null> {
    return this.em.findOne(Caller, { phoneNumber });
  }

  /**
   * Generate a 6-digit OTP code for a caller.
   * Expires in 5 minutes.
   */
  async createOtp(caller: Caller): Promise<Otp> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otp = this.em.create(Otp, {
      caller,
      code,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
    });

    await this.em.persist(otp).flush();
    this.logger.log(`OTP created for ${caller.phoneNumber}`);

    return otp;
  }

  /**
   * Verify an OTP code for a phone number.
   * Returns the caller if valid, null otherwise.
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<Caller | null> {
    const caller = await this.em.findOne(Caller, { phoneNumber });
    if (!caller) return null;

    const otp = await this.em.findOne(Otp, {
      caller,
      code,
      isUsed: false,
      expiresAt: { $gte: new Date() },
    });

    if (!otp) return null;

    otp.isUsed = true;
    await this.em.flush();

    return caller;
  }
}
