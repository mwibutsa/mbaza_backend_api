import { ApiProperty } from '@nestjs/swagger';
import { AuditAction, ActorType } from '../../common/enums';

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: AuditAction })
  action!: AuditAction;

  @ApiProperty({ enum: ActorType })
  actorType!: ActorType;

  @ApiProperty({ nullable: true })
  actorId?: string;

  @ApiProperty({ nullable: true })
  details?: string;

  @ApiProperty()
  createdAt!: Date;
}
