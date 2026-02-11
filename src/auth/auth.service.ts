import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../admin-users/admin-user.entity';
import { CallersService } from '../callers/callers.service';
import { SmsService } from '../sms/sms.service';
import { UserRole } from '../common/enums';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly em: EntityManager,
    private readonly callersService: CallersService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Admin login with email + password.
   */
  async adminLogin(email: string, password: string) {
    const admin = await this.em.findOne(AdminUser, { email, isActive: true });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: admin.id, role: admin.role };
    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Admin login: ${email}`);

    return {
      accessToken,
      role: admin.role,
      userId: admin.id,
    };
  }

  /**
   * Request an OTP for citizen authentication.
   * Creates the caller if they don't exist.
   */
  async requestOtp(phoneNumber: string) {
    const caller = await this.callersService.findOrCreate(phoneNumber);
    const otp = await this.callersService.createOtp(caller);
    await this.smsService.sendOtp(phoneNumber, otp.code);

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify an OTP and issue a JWT for the citizen.
   */
  async verifyOtp(phoneNumber: string, code: string) {
    const caller = await this.callersService.verifyOtp(phoneNumber, code);

    if (!caller) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const payload: JwtPayload = { sub: caller.id, role: UserRole.CITIZEN };
    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Citizen authenticated: ${phoneNumber}`);

    return {
      accessToken,
      role: UserRole.CITIZEN,
      userId: caller.id,
    };
  }
}
