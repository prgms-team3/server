import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
	@ApiProperty({ description: 'User email', example: 'user@example.com' })
	@IsNotEmpty({ message: '이메일은 필수입니다.' })
	@IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
	@MaxLength(255, { message: '이메일은 255자를 초과할 수 없습니다.' })
	email: string;

	@ApiProperty({ description: 'User name', example: 'John Doe' })
	@IsOptional()
	@IsString()
	@MaxLength(100, { message: '이름은 100자를 초과할 수 없습니다.' })
	name?: string;

	@ApiProperty({ description: 'User phone number', example: '010-1234-5678', required: false })
	@IsOptional()
	@IsString()
	@MaxLength(20, { message: '전화번호는 20자를 초과할 수 없습니다.' })
	phone?: string;

	@ApiProperty({ description: 'Social login provider', example: 'kakao', required: false })
	@IsOptional()
	@IsEnum(['kakao', 'google'])
	provider?: 'kakao' | 'google';

	@ApiProperty({ description: 'Social login provider ID', example: '123456789', required: false })
	@IsOptional()
	@IsString()
	providerId?: string;
}
