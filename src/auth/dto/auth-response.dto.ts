import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  userId!: string;
}
