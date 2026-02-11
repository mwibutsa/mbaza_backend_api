import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignCaseDto {
  @ApiProperty({ description: 'Admin user ID to assign the case to' })
  @IsUUID()
  adminUserId!: string;
}
