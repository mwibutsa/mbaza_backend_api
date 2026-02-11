import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  district!: string;

  @ApiPropertyOptional()
  sector?: string;

  @ApiPropertyOptional()
  cell?: string;

  @ApiPropertyOptional()
  village?: string;

  @ApiProperty()
  createdAt!: Date;
}
