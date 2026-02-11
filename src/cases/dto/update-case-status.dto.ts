import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CaseStatus } from '../../common/enums/case-status.enum';

export class UpdateCaseStatusDto {
  @ApiProperty({ enum: CaseStatus, example: CaseStatus.IN_PROGRESS })
  @IsEnum(CaseStatus)
  status!: CaseStatus;
}
