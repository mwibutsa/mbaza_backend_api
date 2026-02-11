import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { CaseStatus } from '../../common/enums/case-status.enum';
import { CaseUrgency } from '../../common/enums/case-urgency.enum';
import { AiCategory } from '../../common/enums/ai-category.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CaseFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiPropertyOptional({ enum: CaseUrgency })
  @IsOptional()
  @IsEnum(CaseUrgency)
  urgency?: CaseUrgency;

  @ApiPropertyOptional({ enum: AiCategory })
  @IsOptional()
  @IsEnum(AiCategory)
  category?: AiCategory;

  @ApiPropertyOptional({ description: 'Filter by location district' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
