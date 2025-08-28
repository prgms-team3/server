import { ApiProperty } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ description: 'User email', example: 'user@example.com' })
	@IsNotEmpty({ message: '이메일은 필수입니다.' })
	@IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
	@MaxLength(255, { message: '이메일은 255자를 초과할 수 없습니다.' })
	email: string;

	@ApiProperty({ description: 'User password', example: 'password123' })
	@IsNotEmpty({ message: '비밀번호는 필수입니다.' })
	@IsString()
	@MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
	@MaxLength(255, { message: '비밀번호는 255자를 초과할 수 없습니다.' })
	password: string;

	@ApiProperty({ description: 'User name', example: 'John Doe' })
	@IsNotEmpty({ message: '이름은 필수입니다.' })
	@IsString()
	@MaxLength(100, { message: '이름은 100자를 초과할 수 없습니다.' })
	name: string;

	@ApiProperty({ description: 'User phone number', example: '010-1234-5678', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(20, { message: '전화번호는 20자를 초과할 수 없습니다.' })
	phone?: string;
}
