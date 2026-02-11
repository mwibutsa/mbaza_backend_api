import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'Musanze' })
  @IsString()
  district!: string;

  @ApiPropertyOptional({ example: 'Kinigi' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: 'Nyonirima' })
  @IsOptional()
  @IsString()
  cell?: string;

  @ApiPropertyOptional({ example: 'Bisoke' })
  @IsOptional()
  @IsString()
  village?: string;
}
