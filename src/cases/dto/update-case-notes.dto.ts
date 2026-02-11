import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateCaseNotesDto {
  @ApiProperty({ description: 'Resolution notes for the case' })
  @IsString()
  @MinLength(1)
  notes!: string;
}
