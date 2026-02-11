import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CallerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  phoneNumber!: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiPropertyOptional()
  sector?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
