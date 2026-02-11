import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Caller } from './caller.entity';
import { Otp } from './otp.entity';
import { CallersService } from './callers.service';

@Module({
  imports: [MikroOrmModule.forFeature([Caller, Otp])],
  providers: [CallersService],
  exports: [CallersService],
})
export class CallersModule {}
