import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddUserToWorkspaceDto {
  @ApiProperty({ description: 'User ID to add', example: 1 })
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  @IsNumber({}, { message: '사용자 ID는 숫자여야 합니다.' })
  userId: number;

  @ApiProperty({ description: 'Whether user should be admin', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean = false;
}
