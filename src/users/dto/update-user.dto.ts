import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
	@ApiProperty({ description: 'User email', example: 'user@example.com', required: false })
	@IsOptional()
	@IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
	@MaxLength(255, { message: '이메일은 255자를 초과할 수 없습니다.' })
	email?: string;

	@ApiProperty({ description: 'User name', example: 'John Doe', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(100, { message: '이름은 100자를 초과할 수 없습니다.' })
	name?: string;

	@ApiProperty({ description: 'User phone number', example: '010-1234-5678', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(20, { message: '전화번호는 20자를 초과할 수 없습니다.' })
	phone?: string;
}
