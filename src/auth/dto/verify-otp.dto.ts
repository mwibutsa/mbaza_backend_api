import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+250781234567' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Phone number must be in E.164 format' })
  phoneNumber!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
