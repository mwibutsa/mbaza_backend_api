import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus, CaseUrgency, AiCategory } from '../../common/enums';
import { CallerResponseDto } from '../../callers/dto/caller-response.dto';
import { LocationResponseDto } from '../../locations/dto/location-response.dto';

export class CaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  callSid!: string;

  @ApiProperty({ type: CallerResponseDto })
  caller!: CallerResponseDto;

  @ApiPropertyOptional({ type: LocationResponseDto })
  location?: LocationResponseDto;

  @ApiProperty({ enum: AiCategory, isArray: true })
  categories!: AiCategory[];

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  transcript?: string;

  @ApiProperty({ enum: CaseUrgency })
  urgency!: CaseUrgency;

  @ApiProperty({ enum: CaseStatus })
  status!: CaseStatus;

  @ApiPropertyOptional()
  aiAudioUrl?: string;

  @ApiPropertyOptional()
  resolutionNotes?: string;

  @ApiPropertyOptional()
  assignedTo?: { id: string; fullName: string };

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedCasesResponseDto {
  @ApiProperty({ type: [CaseResponseDto] })
  data!: CaseResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
