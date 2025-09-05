import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
	@ApiPropertyOptional({ description: '사용자 이름', example: 'Son', required: false })
	@IsOptional()
	@IsString()
	@Length(2, 50, { message: '이름은 2자 이상 50자 이하이어야 합니다.' })
	name?: string;

	@ApiPropertyOptional({ description: '전화번호', example: '010-1234-5678', required: false })
	@IsOptional()
	@IsString()
	@Matches(/^010-\d{4}-\d{4}$/, {
		message: '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)',
	})
	phoneNumber?: string;
}
