import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: '+250781234567',
    description: 'Phone number in E.164 format',
  })
  @IsString()
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format (e.g. +250781234567)',
  })
  phoneNumber!: string;
}
