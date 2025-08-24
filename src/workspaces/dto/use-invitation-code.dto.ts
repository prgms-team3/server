import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UseInvitationCodeDto {
  @ApiProperty({ description: 'Invitation code', example: 'ABC123DEF' })
  @IsNotEmpty({ message: '초대 코드는 필수입니다.' })
  @IsString()
  @MaxLength(50, { message: '초대 코드는 50자를 초과할 수 없습니다.' })
  code: string;
}
