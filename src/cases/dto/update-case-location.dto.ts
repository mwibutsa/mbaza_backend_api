import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateCaseLocationDto {
  @ApiProperty({ description: 'Location ID where the issue is' })
  @IsUUID()
  locationId!: string;
}
